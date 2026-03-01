import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { useSelectedProject } from "@/context/SelectedProjectContext";
import { useProjects } from "@/hooks/useProjects";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useVendors } from "@/hooks/useVendors";
import { useContractors } from "@/hooks/useContractors";
import { useEmployees } from "@/hooks/useEmployees";
import { useConsumableItems } from "@/hooks/useConsumableItems";
import { useNonConsumableItems } from "@/hooks/useNonConsumableItems";
import { useMachines } from "@/hooks/useMachines";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Building2,
  UserPlus,
  PlusCircle,
  Truck,
  HardHat,
  Users,
  Receipt,
  Wrench,
  Package,
  Box,
  CreditCard,
  FileText,
} from "lucide-react";
import { AddBankAccountDialog } from "@/components/dialogs/AddBankAccountDialog";
import { AddBankTransactionDialog } from "@/components/dialogs/AddBankTransactionDialog";
import { CreateUserDialog } from "@/components/dialogs/CreateUserDialog";
import { AddVendorDialog } from "@/components/dialogs/AddVendorDialog";
import { AddContractorDialog } from "@/components/dialogs/AddContractorDialog";
import { AddEmployeeDialog } from "@/components/dialogs/AddEmployeeDialog";
import { AddExpenseDialog } from "@/components/dialogs/AddExpenseDialog";
import { AddMachineDialog } from "@/components/dialogs/AddMachineDialog";
import { AddConsumableItemDialog } from "@/components/dialogs/AddConsumableItemDialog";
import { AddNonConsumableItemDialog } from "@/components/dialogs/AddNonConsumableItemDialog";
import { VendorPaymentDialog } from "@/components/dialogs/VendorPaymentDialog";
import { AddContractorEntryDialog } from "@/components/dialogs/AddContractorEntryDialog";
import { ContractorPaymentDialog } from "@/components/dialogs/ContractorPaymentDialog";
import { EmployeeLiabilityPaymentDialog } from "@/components/dialogs/EmployeeLiabilityPaymentDialog";
import { AddLedgerEntryDialog } from "@/components/dialogs/AddLedgerEntryDialog";
import { StockConsumptionDialog } from "@/components/dialogs/StockConsumptionDialog";
import { AddNonConsumableEntryDialog } from "@/components/dialogs/AddNonConsumableEntryDialog";
import { AddMachineLedgerEntryDialog } from "@/components/dialogs/AddMachineLedgerEntryDialog";
import { MachinePaymentDialog } from "@/components/dialogs/MachinePaymentDialog";
import {
  SelectVendorDialog,
  SelectContractorDialog,
  SelectEmployeeDialog,
  SelectConsumableItemDialog,
  SelectNonConsumableItemDialog,
  SelectMachineDialog,
} from "@/components/dialogs/quick-entry";
import type { ApiVendor } from "@/services/vendorsService";
import type { ApiContractorWithTotals } from "@/services/contractorsService";
import type { ApiEmployeeWithSnapshot } from "@/services/employeesService";
import type { ApiConsumableItem } from "@/services/consumableItemsService";
import type { ApiNonConsumableItem, InUseByProjectEntry } from "@/services/nonConsumableItemService";
import type { ApiMachineWithTotals } from "@/services/machinesService";

type DialogType =
  | "add-bank-account"
  | "add-bank-transaction"
  | "create-user"
  | "add-vendor"
  | "add-contractor"
  | "add-employee"
  | "add-expense"
  | "add-machine"
  | "add-consumable-item"
  | "add-non-consumable-item"
  | "select-vendor"
  | "select-contractor"
  | "select-employee"
  | "select-consumable-item"
  | "select-non-consumable-item"
  | "select-machine"
  | "vendor-payment"
  | "contractor-entry"
  | "contractor-payment"
  | "employee-payment"
  | "consumable-ledger-entry"
  | "stock-consumption"
  | "non-consumable-entry"
  | "machine-ledger-entry"
  | "machine-payment"
  | null;

export default function QuickEntry() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const { selectedProjectId, setSelectedProjectId } = useSelectedProject();
  const isSiteManager = user?.role === "Site Manager";
  const assignedProjectId = user?.assignedProjectId ?? null;
  const effectiveProjectId = isSiteManager ? assignedProjectId : (selectedProjectId || null);

  const { accounts, refetch: refetchAccounts } = useBankAccounts();
  const { vendors, refetch: refetchVendors } = useVendors(effectiveProjectId);
  const { contractors, refetch: refetchContractors } = useContractors(effectiveProjectId);
  const { employees, refetch: refetchEmployees } = useEmployees(effectiveProjectId);
  const { items: consumableItems, refetch: refetchConsumableItems } = useConsumableItems(effectiveProjectId);
  const { items: nonConsumableItems } = useNonConsumableItems();
  const { machines, refetch: refetchMachines } = useMachines(effectiveProjectId, 1, 100);

  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [categoriesRefreshKey, setCategoriesRefreshKey] = useState(0);
  const ledgerDialogTypes: DialogType[] = [
    "vendor-payment",
    "contractor-entry",
    "contractor-payment",
    "employee-payment",
    "consumable-ledger-entry",
    "stock-consumption",
    "non-consumable-entry",
    "machine-ledger-entry",
    "machine-payment",
  ];

  const [selectedVendor, setSelectedVendor] = useState<ApiVendor | null>(null);
  const [selectedContractor, setSelectedContractor] = useState<ApiContractorWithTotals | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<ApiEmployeeWithSnapshot | null>(null);
  const [selectedConsumableItem, setSelectedConsumableItem] = useState<ApiConsumableItem | null>(null);
  const [selectedNonConsumableItem, setSelectedNonConsumableItem] = useState<ApiNonConsumableItem | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<ApiMachineWithTotals | null>(null);

  const projectOptions = useMemo(() => {
    if (isSiteManager && assignedProjectId) {
      const p = projects.find((pr) => pr.id === assignedProjectId);
      return p ? [{ id: p.id, name: p.name }] : [];
    }
    return projects;
  }, [isSiteManager, assignedProjectId, projects]);

  const effectiveProjectName = useMemo(() => {
    return projects.find((p) => p.id === effectiveProjectId)?.name ?? "";
  }, [projects, effectiveProjectId]);

  const openDialog = (type: DialogType) => {
    setDialogType(type);
  };
  const closeDialog = () => {
    setDialogType(null);
    setSelectedVendor(null);
    setSelectedContractor(null);
    setSelectedEmployee(null);
    setSelectedConsumableItem(null);
    setSelectedNonConsumableItem(null);
    setSelectedMachine(null);
  };

  const handlePickerOpenChange = (open: boolean) => {
    if (!open) {
      if (ledgerDialogTypes.includes(dialogType)) return;
      closeDialog();
    }
  };

  const nonConsumableInUseByProject = useMemo(() => {
    if (!selectedNonConsumableItem?.inUseByProject) return {};
    return Object.fromEntries(
      (selectedNonConsumableItem.inUseByProject as InUseByProjectEntry[]).map((e) => [e.projectId, e.quantity])
    );
  }, [selectedNonConsumableItem]);

  const noProjectHint = !effectiveProjectId && !isSiteManager;

  return (
    <Layout>
      <PageHeader
        title="Quick Entry"
        subtitle="Create entities and ledger entries from one place"
      />

      {!isSiteManager && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Label className="text-muted-foreground">Project (for entries below)</Label>
          <Select value={selectedProjectId || ""} onValueChange={(v) => setSelectedProjectId(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projectOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {noProjectHint && (
            <p className="text-sm text-muted-foreground">Select a project to create entries.</p>
          )}
        </div>
      )}

      {/* Company-level */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Company-level</h3>
        <div className="flex flex-wrap gap-3">
          {(user?.role === "Admin" || user?.role === "Super Admin") && (
            <>
              <Button variant="outline" size="sm" onClick={() => openDialog("add-bank-account")}>
                <Building2 className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
              <Button variant="outline" size="sm" onClick={() => openDialog("add-bank-transaction")}>
                <CreditCard className="h-4 w-4 mr-2" />
                Create Transaction
              </Button>
            </>
          )}
          {(user?.role === "Admin" || user?.role === "Super Admin") && (
            <Button variant="outline" size="sm" onClick={() => openDialog("create-user")}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          )}
        </div>
      </section>

      {/* Project-based */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Project-based</h3>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Vendors */}
          <Card
            title="Vendors"
            icon={<Truck className="h-4 w-4" />}
            createLabel="Add Vendor"
            ledgerLabel="Record Payment"
            onCreate={() => openDialog("add-vendor")}
            onLedger={() => openDialog("select-vendor")}
            disabled={noProjectHint}
          />
          {/* Contractors */}
          <Card
            title="Contractors"
            icon={<HardHat className="h-4 w-4" />}
            createLabel="Add Contractor"
            ledgerLabel="Add Entry / Payment"
            onCreate={() => openDialog("add-contractor")}
            onLedger={() => openDialog("select-contractor")}
            disabled={noProjectHint}
          />
          {/* Employees */}
          <Card
            title="Employees"
            icon={<Users className="h-4 w-4" />}
            createLabel="Add Employee"
            ledgerLabel="Record Payment"
            onCreate={() => openDialog("add-employee")}
            onLedger={() => openDialog("select-employee")}
            disabled={noProjectHint}
          />
          {/* Expenses */}
          <Card
            title="Expenses"
            icon={<Receipt className="h-4 w-4" />}
            createLabel="Add Expense"
            onCreate={() => openDialog("add-expense")}
            disabled={noProjectHint}
          />
          {/* Machinery */}
          <Card
            title="Machinery"
            icon={<Wrench className="h-4 w-4" />}
            createLabel="Add Machine"
            ledgerLabel="Ledger / Payment"
            onCreate={() => openDialog("add-machine")}
            onLedger={() => openDialog("select-machine")}
            disabled={noProjectHint}
          />
          {/* Consumable */}
          <Card
            title="Consumable Inventory"
            icon={<Package className="h-4 w-4" />}
            createLabel="Add Item"
            ledgerLabel="Ledger / Consumption"
            onCreate={() => openDialog("add-consumable-item")}
            onLedger={() => openDialog("select-consumable-item")}
            disabled={noProjectHint}
          />
          {/* Non-consumable */}
          <Card
            title="Non-Consumable Inventory"
            icon={<Box className="h-4 w-4" />}
            createLabel="Add Asset"
            ledgerLabel="Add Ledger Entry"
            onCreate={() => openDialog("add-non-consumable-item")}
            onLedger={() => openDialog("select-non-consumable-item")}
            disabled={noProjectHint}
          />
        </div>
      </section>

      {/* Company-level dialogs */}
      <AddBankAccountDialog
        open={dialogType === "add-bank-account"}
        onOpenChange={(open) => !open && closeDialog()}
        onSuccess={() => { refetchAccounts(); closeDialog(); }}
      />
      <AddBankTransactionDialog
        open={dialogType === "add-bank-transaction"}
        onOpenChange={(open) => !open && closeDialog()}
        accounts={accounts}
        projects={projects}
        onSuccess={closeDialog}
      />
      {user?.role && (
        <CreateUserDialog
          open={dialogType === "create-user"}
          onOpenChange={(open) => !open && closeDialog()}
          onCreated={closeDialog}
          currentUserRole={user.role}
          projects={projects}
        />
      )}

      {/* Project-based create dialogs */}
      <AddVendorDialog
        open={dialogType === "add-vendor"}
        onOpenChange={(open) => !open && closeDialog()}
        projectId={effectiveProjectId}
        onSuccess={() => { refetchVendors(); closeDialog(); }}
      />
      <AddContractorDialog
        open={dialogType === "add-contractor"}
        onOpenChange={(open) => !open && closeDialog()}
        restrictedProjectId={effectiveProjectId ?? undefined}
        restrictedProjectName={effectiveProjectName || undefined}
        projects={projectOptions}
        onSuccess={() => { refetchContractors(); closeDialog(); }}
      />
      <AddEmployeeDialog
        open={dialogType === "add-employee"}
        onOpenChange={(open) => !open && closeDialog()}
        restrictedProjectId={effectiveProjectId ?? undefined}
        restrictedProjectName={effectiveProjectName || undefined}
        projects={projectOptions}
      />
      <AddExpenseDialog
        open={dialogType === "add-expense"}
        onOpenChange={(open) => !open && closeDialog()}
        projectId={effectiveProjectId}
        categoriesRefreshKey={categoriesRefreshKey}
        onSuccess={() => { setCategoriesRefreshKey((k) => k + 1); closeDialog(); }}
      />
      <AddMachineDialog
        open={dialogType === "add-machine"}
        onOpenChange={(open) => !open && closeDialog()}
        restrictedProjectId={effectiveProjectId ?? undefined}
        restrictedProjectName={effectiveProjectName || undefined}
        projects={projectOptions}
        onSuccess={() => { refetchMachines(); closeDialog(); }}
      />
      <AddConsumableItemDialog
        open={dialogType === "add-consumable-item"}
        onOpenChange={(open) => !open && closeDialog()}
        projectId={effectiveProjectId}
        onSuccess={() => { refetchConsumableItems(); closeDialog(); }}
      />
      <AddNonConsumableItemDialog
        open={dialogType === "add-non-consumable-item"}
        onOpenChange={(open) => !open && closeDialog()}
        onSuccess={closeDialog}
      />

      {/* Picker dialogs */}
      <SelectVendorDialog
        open={dialogType === "select-vendor"}
        onOpenChange={handlePickerOpenChange}
        projectId={effectiveProjectId}
        vendors={vendors}
        onSelect={(vendor) => { setSelectedVendor(vendor); setDialogType("vendor-payment"); }}
      />
      <SelectContractorDialog
        open={dialogType === "select-contractor"}
        onOpenChange={handlePickerOpenChange}
        projectId={effectiveProjectId}
        contractors={contractors}
        onSelectEntry={(c) => { setSelectedContractor(c); setDialogType("contractor-entry"); }}
        onSelectPayment={(c) => { setSelectedContractor(c); setDialogType("contractor-payment"); }}
      />
      <SelectEmployeeDialog
        open={dialogType === "select-employee"}
        onOpenChange={handlePickerOpenChange}
        projectId={effectiveProjectId}
        employees={employees}
        onSelect={(employee) => { setSelectedEmployee(employee); setDialogType("employee-payment"); }}
      />
      <SelectConsumableItemDialog
        open={dialogType === "select-consumable-item"}
        onOpenChange={handlePickerOpenChange}
        projectId={effectiveProjectId}
        items={consumableItems}
        onSelectLedgerEntry={(item) => { setSelectedConsumableItem(item); setDialogType("consumable-ledger-entry"); }}
        onSelectConsumption={() => setDialogType("stock-consumption")}
      />
      <SelectNonConsumableItemDialog
        open={dialogType === "select-non-consumable-item"}
        onOpenChange={handlePickerOpenChange}
        items={nonConsumableItems}
        onSelect={(item) => { setSelectedNonConsumableItem(item); setDialogType("non-consumable-entry"); }}
      />
      <SelectMachineDialog
        open={dialogType === "select-machine"}
        onOpenChange={handlePickerOpenChange}
        projectId={effectiveProjectId}
        machines={machines}
        onSelectLedgerEntry={(machine) => { setSelectedMachine(machine); setDialogType("machine-ledger-entry"); }}
        onSelectPayment={(machine) => { setSelectedMachine(machine); setDialogType("machine-payment"); }}
      />

      {/* Ledger dialogs (after picker) */}
      {selectedVendor && (
        <VendorPaymentDialog
          open={dialogType === "vendor-payment"}
          onOpenChange={(open) => { if (!open) closeDialog(); }}
          vendor={selectedVendor}
          onSuccess={() => { refetchVendors(); closeDialog(); }}
        />
      )}
      {selectedContractor && effectiveProjectId && (
        <>
          <AddContractorEntryDialog
            open={dialogType === "contractor-entry"}
            onOpenChange={(open) => { if (!open) closeDialog(); }}
            projectId={effectiveProjectId}
            contractors={contractors}
            defaultContractorId={selectedContractor.id}
            onSuccess={() => { refetchContractors(); closeDialog(); }}
          />
          <ContractorPaymentDialog
            open={dialogType === "contractor-payment"}
            onOpenChange={(open) => { if (!open) closeDialog(); }}
            contractor={selectedContractor}
            remainingBalance={selectedContractor.remaining ?? 0}
            onSuccess={() => { refetchContractors(); closeDialog(); }}
          />
        </>
      )}
      {selectedEmployee && (
        <EmployeeLiabilityPaymentDialog
          open={dialogType === "employee-payment"}
          onOpenChange={(open) => { if (!open) closeDialog(); }}
          employee={selectedEmployee}
          onSuccess={() => { refetchEmployees(); closeDialog(); }}
        />
      )}
      {selectedConsumableItem && effectiveProjectId && (
          <AddLedgerEntryDialog
            open={dialogType === "consumable-ledger-entry"}
            onOpenChange={(open) => { if (!open) closeDialog(); }}
            itemId={selectedConsumableItem.id}
            itemName={selectedConsumableItem.name}
            projectId={effectiveProjectId}
            onSuccess={() => { refetchConsumableItems(); closeDialog(); }}
          />
        )}
      {effectiveProjectId && (
          <StockConsumptionDialog
            open={dialogType === "stock-consumption"}
            onOpenChange={(open) => { if (!open) closeDialog(); }}
            projectId={effectiveProjectId}
            consumableItems={consumableItems}
            onSuccess={() => { refetchConsumableItems(); closeDialog(); }}
          />
        )}
      {selectedNonConsumableItem && (
        <AddNonConsumableEntryDialog
          open={dialogType === "non-consumable-entry"}
          onOpenChange={(open) => { if (!open) closeDialog(); }}
          itemId={selectedNonConsumableItem.id}
          itemName={selectedNonConsumableItem.name}
          projects={projectOptions}
          inUseByProject={nonConsumableInUseByProject}
          companyStore={selectedNonConsumableItem.companyStore}
          inUse={selectedNonConsumableItem.inUse}
          underRepair={selectedNonConsumableItem.underRepair}
          onSuccess={closeDialog}
        />
      )}
      {selectedMachine && (
        <>
          <AddMachineLedgerEntryDialog
            open={dialogType === "machine-ledger-entry"}
            onOpenChange={(open) => { if (!open) closeDialog(); }}
            machine={selectedMachine}
            onSuccess={() => { refetchMachines(); closeDialog(); }}
          />
          <MachinePaymentDialog
            open={dialogType === "machine-payment"}
            onOpenChange={(open) => { if (!open) closeDialog(); }}
            machine={selectedMachine}
            remainingBalance={selectedMachine.totalPending ?? 0}
            onSuccess={() => { refetchMachines(); closeDialog(); }}
          />
        </>
      )}
    </Layout>
  );
}

function Card({
  title,
  icon,
  createLabel,
  ledgerLabel,
  onCreate,
  onLedger,
  disabled,
}: {
  title: string;
  icon: React.ReactNode;
  createLabel: string;
  ledgerLabel?: string;
  onCreate: () => void;
  onLedger?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="border border-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 font-medium">
        {icon}
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="warning" size="sm" onClick={onCreate} disabled={disabled}>
          <PlusCircle className="h-3.5 w-3.5 mr-1" />
          {createLabel}
        </Button>
        {onLedger && ledgerLabel && (
          <Button variant="outline" size="sm" onClick={onLedger} disabled={disabled}>
            <FileText className="h-3.5 w-3.5 mr-1" />
            {ledgerLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
