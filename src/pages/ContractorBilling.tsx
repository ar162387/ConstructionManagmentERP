import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  DollarSign,
  CreditCard,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProject, useCanEdit, useCanDelete } from '@/contexts/ProjectContext';
import * as contractorService from '@/services/contractorService';
import * as contractorBillingService from '@/services/contractorBillingService';
import * as contractorPaymentService from '@/services/contractorPaymentService';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, lastDayOfMonth } from 'date-fns';
import { ContractorBillingEntryDialog } from '@/components/modals/ContractorBillingEntryDialog';
import { ContractorPaymentDialog } from '@/components/modals/ContractorPaymentDialog';
import type { ContractorBillingEntry, Contractor } from '@/types';
import type { ContractorBillingKpis } from '@/services/contractorBillingService';
import { toast } from '@/hooks/use-toast';

function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

/** Returns true if string is a valid yyyy-MM month. */
function isValidMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

/** Use current month when value is empty or invalid (avoids crash when user clears month input). */
function effectiveMonth(value: string): string {
  return value && isValidMonth(value) ? value : getCurrentMonth();
}

function getEndOfMonthDate(month: string): string {
  const m = effectiveMonth(month);
  const [y, mo] = m.split('-').map(Number);
  return format(lastDayOfMonth(new Date(y, mo - 1)), 'yyyy-MM-dd');
}

export default function ContractorBilling() {
  const { isAuthenticated } = useAuth();
  const {
    selectedProjectId,
    setSelectedProjectId,
    availableProjects,
    isLoading: projectsLoading,
  } = useProject();
  const canEdit = useCanEdit();
  const canDelete = useCanDelete();
  const popoverContainerRef = useRef<HTMLDivElement>(null);
  /** Effective project: context selection or first available (site manager sees scoped project; admin can choose). */
  const effectiveProjectId = selectedProjectId ?? availableProjects[0]?.id ?? null;

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [entries, setEntries] = useState<ContractorBillingEntry[]>([]);
  const [kpis, setKpis] = useState<ContractorBillingKpis>({
    totalBilled: 0,
    totalPaid: 0,
    remaining: 0,
  });
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(getCurrentMonth());
  const [selectedContractorId, setSelectedContractorId] = useState<string>('');
  const [billingEntryDialogOpen, setBillingEntryDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ContractorBillingEntry | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const loadData = () => {
    if (!effectiveProjectId) return;
    setLoading(true);
    const monthToLoad = effectiveMonth(month);
    Promise.all([
      contractorService.getContractors(effectiveProjectId),
      contractorBillingService.getBillingEntries(
        effectiveProjectId,
        monthToLoad,
        selectedContractorId || undefined
      ),
    ])
      .then(([contractorsList, { entries: entriesList, kpis: kpisData }]) => {
        setContractors(contractorsList);
        setEntries(entriesList);
        setKpis(kpisData);
      })
      .catch(() => {
        toast({
          title: 'Error',
          description: 'Failed to load contractor billing data.',
          variant: 'destructive',
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [effectiveProjectId, month, selectedContractorId]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const contractorOptions = [
    { value: '', label: 'All Contractors' },
    ...contractors.map((c) => ({ value: c.id, label: c.name })),
  ];

  const selectedContractor = selectedContractorId
    ? contractors.find((c) => c.id === selectedContractorId)
    : null;

  const handleAddBillingEntry = () => {
    setSelectedEntry(null);
    setBillingEntryDialogOpen(true);
  };

  const handleEditBillingEntry = (entry: ContractorBillingEntry) => {
    setSelectedEntry(entry);
    setBillingEntryDialogOpen(true);
  };

  const handleSaveBillingEntry = async (data: {
    id?: string;
    projectId: string;
    contractorId: string;
    amount: number;
    remarks?: string;
    entryDate: string;
  }) => {
    try {
      if (data.id) {
        await contractorBillingService.updateBillingEntry(data.id, {
          amount: data.amount,
          remarks: data.remarks,
          entryDate: data.entryDate,
        });
        toast({
          title: 'Billing Entry Updated',
          description: 'The billing entry has been updated.',
        });
      } else {
        await contractorBillingService.createBillingEntry({
          projectId: data.projectId,
          contractorId: data.contractorId,
          amount: data.amount,
          remarks: data.remarks,
          entryDate: data.entryDate,
        });
        toast({
          title: 'Billing Entry Added',
          description: 'The billing entry has been added.',
        });
      }
      setBillingEntryDialogOpen(false);
      setSelectedEntry(null);
      loadData();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message ===
          'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to save billing entry.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleDeleteBillingEntry = async () => {
    if (!selectedEntry) return;
    try {
      await contractorBillingService.deleteBillingEntry(selectedEntry.id);
      toast({
        title: 'Billing Entry Deleted',
        description: 'The billing entry has been deleted.',
      });
      setDeleteDialogOpen(false);
      setSelectedEntry(null);
      loadData();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message ===
          'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to delete billing entry.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleRecordPayment = () => {
    setPaymentDialogOpen(true);
  };

  const handleSavePayment = async (data: {
    contractorId: string;
    amount: number;
    paymentDate: string;
    paymentMode?: string;
    reference?: string;
  }) => {
    try {
      await contractorPaymentService.recordPayment(data.contractorId, {
        amount: data.amount,
        paymentDate: data.paymentDate,
        paymentMode: data.paymentMode,
        reference: data.reference,
      });
      toast({
        title: 'Payment Recorded',
        description: `Payment of ${formatCurrency(data.amount)} has been recorded.`,
      });
      setPaymentDialogOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message ===
          'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to record payment.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  if (projectsLoading && availableProjects.length === 0) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </AppLayout>
    );
  }

  if (!effectiveProjectId) {
    return (
      <AppLayout>
        <div className="p-6">
          <p className="text-muted-foreground">
            No projects available. You need access to at least one project to view contractor billing.
          </p>
        </div>
      </AppLayout>
    );
  }

  if (loading && entries.length === 0 && contractors.length === 0) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">Loading contractor billing...</p>
        </div>
      </AppLayout>
    );
  }

  const monthForDisplay = effectiveMonth(month);
  const monthLabel = format(new Date(monthForDisplay + '-01'), 'MMMM yyyy');

  return (
    <AppLayout>
      <div ref={popoverContainerRef} className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contractor Billing</h1>
            <p className="text-muted-foreground">
              Billing entries and consolidated monthly payments. Select a contractor to filter.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRecordPayment}>
              <CreditCard className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
            <Button onClick={handleAddBillingEntry}>
              <Plus className="mr-2 h-4 w-4" />
              Add Billing Entry
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Project</span>
          <Select
            value={effectiveProjectId ?? ''}
            onValueChange={(value) => setSelectedProjectId(value)}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {availableProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label htmlFor="month" className="text-sm font-medium whitespace-nowrap">
              Month
            </label>
            <input
              id="month"
              type="month"
              value={month || getCurrentMonth()}
              onChange={(e) => {
                const v = e.target.value;
                setMonth(v || getCurrentMonth());
              }}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="w-full max-w-md">
            <Combobox
              value={selectedContractorId}
              onValueChange={setSelectedContractorId}
              options={contractorOptions}
              placeholder="Select contractor..."
              searchPlaceholder="Search contractors..."
              emptyMessage="No contractors found."
              container={popoverContainerRef.current}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Billed
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpis.totalBilled)}</div>
              <p className="text-xs text-muted-foreground">
                {monthLabel}
                {selectedContractor ? ` – ${selectedContractor.name}` : ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Paid
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(kpis.totalPaid)}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Remaining
              </CardTitle>
              <DollarSign className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(kpis.remaining)}
              </div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedContractor
                ? `${selectedContractor.name} – Billing Entries`
                : 'Billing Entries'}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({monthLabel})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Remarks</TableHead>
                  {(canEdit || canDelete) && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No billing entries for this month.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.entryDate), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        {entry.contractor?.name ?? entry.contractorId}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {entry.remarks || '—'}
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              {canEdit && (
                                <DropdownMenuItem
                                  onClick={() => handleEditBillingEntry(entry)}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setSelectedEntry(entry);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ContractorBillingEntryDialog
        open={billingEntryDialogOpen}
        onOpenChange={(open) => {
          setBillingEntryDialogOpen(open);
          if (!open) setSelectedEntry(null);
        }}
        entry={selectedEntry}
        contractors={contractors}
        projectId={effectiveProjectId}
        onSave={handleSaveBillingEntry}
      />

      <ContractorPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        contractors={contractors}
        preselectedContractorId={selectedContractorId || null}
        defaultPaymentDate={getEndOfMonthDate(monthForDisplay)}
        onSave={handleSavePayment}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Billing Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this billing entry? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDeleteBillingEntry}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
