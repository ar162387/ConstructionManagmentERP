import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { useAuth } from "@/context/AuthContext";
import { useSelectedProject } from "@/context/SelectedProjectContext";
import { useProjects } from "@/hooks/useProjects";
import { useEmployees } from "@/hooks/useEmployees";
import { AddEmployeeDialog } from "@/components/dialogs/AddEmployeeDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { buildMonthOptionsUpToCurrent, getFirstMonth, getLocalMonthKey, monthLabel, shiftMonth } from "@/lib/employee-ledger";
import type { ApiEmployeeWithSnapshot } from "@/services/employeesService";

type PaymentStatusFilter = "All" | "Paid" | "Partial" | "Due" | "Late";
type EmployeeTab = "Fixed" | "Daily";

function employeeRateLabel(employee: ApiEmployeeWithSnapshot) {
  return employee.type === "Fixed"
    ? `${formatCurrency(employee.monthlySalary ?? 0)}/mo`
    : `${formatCurrency(employee.dailyRate ?? 0)}/day`;
}

function thisMonthLabel(employee: ApiEmployeeWithSnapshot, snapshot: ApiEmployeeWithSnapshot["snapshot"]): string {
  if (!snapshot?.attendance) return "—";
  const att = snapshot.attendance;
  if (att.type === "Fixed") {
    const ulPlusAbsent = att.unpaidLeave + att.absent;
    return `Paid leave: ${att.paidLeave}, Unpaid leave: ${ulPlusAbsent}`;
  }
  return `Overtime: ${att.overtimeHours}h, Days: ${att.workedDays.toFixed(1)}`;
}

function EmployeeRows({
  employees,
  selectedMonth,
  navigate,
  loading,
}: {
  employees: ApiEmployeeWithSnapshot[];
  selectedMonth: string;
  navigate: ReturnType<typeof useNavigate>;
  loading: boolean;
}) {
  const colCount = 9;
  if (loading) {
    return (
      <tr>
        <td colSpan={colCount} className="px-4 py-8 text-center text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading employees…
          </span>
        </td>
      </tr>
    );
  }
  if (employees.length === 0) {
    return (
      <tr>
        <td colSpan={colCount} className="px-4 py-8 text-center text-muted-foreground">
          No employees found.
        </td>
      </tr>
    );
  }

  return (
    <>
      {employees.map((employee) => {
        const firstMonth = getFirstMonth(employee.createdAt);
        const isBeforeEmployeeCreated = firstMonth ? selectedMonth < firstMonth : false;
        const snapshot = isBeforeEmployeeCreated ? undefined : employee.snapshot;
        const totalPaidAllMonths = employee.totalPaid ?? 0;

        return (
          <tr
            key={employee.id}
            className="border-b border-border hover:bg-accent/40 transition-colors cursor-pointer"
            onClick={() => navigate(`/employees/${employee.id}?month=${selectedMonth}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(`/employees/${employee.id}?month=${selectedMonth}`);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Open ${employee.name} ledger`}
          >
            <td className="px-4 py-3 font-semibold">{employee.name}</td>
            <td className="px-4 py-3">{employee.role}</td>
            <td className="px-4 py-3 text-right font-mono">{employeeRateLabel(employee)}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground">
              {isBeforeEmployeeCreated ? "NO DATA" : thisMonthLabel(employee, snapshot)}
            </td>
            <td className="px-4 py-3 text-right font-mono">
              {isBeforeEmployeeCreated ? "NO DATA" : snapshot ? formatCurrency(snapshot.payable) : "—"}
            </td>
            <td className="px-4 py-3 text-right font-mono text-success">
              {isBeforeEmployeeCreated ? "NO DATA" : snapshot ? formatCurrency(snapshot.paid) : "—"}
            </td>
            <td className="px-4 py-3 text-right font-mono text-destructive">
              {isBeforeEmployeeCreated ? "NO DATA" : snapshot && snapshot.remaining > 0 ? formatCurrency(snapshot.remaining) : snapshot ? "-" : "—"}
            </td>
            <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalPaidAllMonths)}</td>
            <td className="px-4 py-3">
              {isBeforeEmployeeCreated ? "NO DATA" : snapshot ? <StatusBadge status={snapshot.paymentStatus} /> : "—"}
            </td>
          </tr>
        );
      })}
    </>
  );
}

export default function Employees() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { projects } = useProjects();
  const isSiteManager = currentUser?.role === "Site Manager";
  const projectFilterName = isSiteManager ? currentUser?.assignedProjectName ?? null : null;

  const { selectedProjectId, setSelectedProjectId } = useSelectedProject();
  const [selectedMonth, setSelectedMonth] = useState<string>(getLocalMonthKey());
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>("All");
  const [addOpen, setAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<EmployeeTab>("Fixed");

  const projectIdForApi = isSiteManager ? undefined : (selectedProjectId || undefined);
  const { employees: allEmployees, loading, error, refetch } = useEmployees(
    projectIdForApi,
    selectedMonth
  );

  const monthOptions = useMemo(() => buildMonthOptionsUpToCurrent(12), []);
  const currentMonth = useMemo(() => getLocalMonthKey(), []);
  const canGoNext = selectedMonth < currentMonth;

  const projectsForSelector = useMemo(
    () => projects.filter((project) => project.status === "Active" || project.status === "On Hold"),
    [projects]
  );

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allEmployees.filter((employee) => {
      const snapshot = employee.snapshot;
      const matchesSearch =
        q.length === 0 ||
        employee.name.toLowerCase().includes(q) ||
        employee.role.toLowerCase().includes(q) ||
        (employee.phone ?? "").toLowerCase().includes(q);
      const matchesPayment =
        paymentFilter === "All" || snapshot?.paymentStatus === paymentFilter;
      return matchesSearch && matchesPayment;
    });
  }, [allEmployees, paymentFilter, searchQuery]);

  const fixedEmployees = useMemo(
    () => filteredEmployees.filter((e) => e.type === "Fixed"),
    [filteredEmployees]
  );
  const dailyEmployees = useMemo(
    () => filteredEmployees.filter((e) => e.type === "Daily"),
    [filteredEmployees]
  );

  const subtitle =
    isSiteManager && projectFilterName
      ? `Month-scoped employee payroll - ${projectFilterName}`
      : selectedProjectId
        ? `Month-scoped employee payroll - ${projects.find((p) => p.id === selectedProjectId)?.name ?? "Project"}`
        : "Month-scoped employee payroll - Select project";

  return (
    <Layout>
      <PageHeader
        title="Employees"
        subtitle={subtitle}
        printTargetId="employees-main-table"
        actions={
          <Button variant="warning" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Employee
          </Button>
        }
      />

      <AddEmployeeDialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) refetch();
        }}
        restrictedProjectId={isSiteManager ? currentUser?.assignedProjectId : undefined}
        restrictedProjectName={isSiteManager ? currentUser?.assignedProjectName : undefined}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />

      <div className="border-2 border-border p-4 space-y-4 mb-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {!isSiteManager && (
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project</Label>
              <Select value={selectedProjectId || ""} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projectsForSelector.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isSiteManager && projectFilterName && (
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project</Label>
              <p className="mt-1.5 text-sm font-medium">{projectFilterName}</p>
            </div>
          )}

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Month</Label>
            <div className="mt-1 flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setSelectedMonth((c) => shiftMonth(c, -1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month} value={month}>
                      {monthLabel(month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={!canGoNext}
                onClick={() => setSelectedMonth((c) => shiftMonth(c, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Search</Label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-1"
              placeholder="Name, role, phone"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Status</Label>
            <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentStatusFilter)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Payment Status</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
                <SelectItem value="Due">Due</SelectItem>
                <SelectItem value="Late">Late</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-destructive text-sm mb-2">{error}</p>
      )}
      {loading && (
        <p className="text-muted-foreground text-sm mb-2">Loading employees…</p>
      )}

      <div className="flex justify-start mb-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EmployeeTab)}>
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="Fixed" className="flex-1 md:flex-none min-w-[140px]">Fixed Salary ({fixedEmployees.length})</TabsTrigger>
            <TabsTrigger value="Daily" className="flex-1 md:flex-none min-w-[140px]">Daily Wage ({dailyEmployees.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div id="employees-main-table" className="border-2 border-border overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-border bg-primary text-primary-foreground">
              <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider">Name</th>
              <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider">Role</th>
              <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider">Rate</th>
              <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider">This Month</th>
              <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider">Payable</th>
              <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider">Paid</th>
              <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider">Remaining</th>
              <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider">Total Paid (All Months)</th>
              <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider">Payment Status</th>
            </tr>
          </thead>
          <tbody>
            <EmployeeRows
              employees={activeTab === "Fixed" ? fixedEmployees : dailyEmployees}
              selectedMonth={selectedMonth}
              navigate={navigate}
              loading={loading}
            />
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: click any employee row to open the dedicated employee ledger page.
      </p>
    </Layout>
  );
}
