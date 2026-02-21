import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { useMockStore } from "@/context/MockStore";
import { AddEmployeeDialog } from "@/components/dialogs/AddEmployeeDialog";
import { AttendanceDialog } from "@/components/dialogs/AttendanceDialog";
import { EmployeePaymentDialog } from "@/components/dialogs/EmployeePaymentDialog";
import { EmployeeAdvanceDialog } from "@/components/dialogs/EmployeeAdvanceDialog";
import { SalaryLedgerDialog } from "@/components/dialogs/SalaryLedgerDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Banknote, Wallet, History, MoreHorizontal } from "lucide-react";
import type { Employee } from "@/lib/mock-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ALL_PROJECTS = "__all__";

function EmployeeTable({
  employees,
  onAttendance,
  onPayment,
  onAdvance,
  onLedger,
}: {
  employees: Employee[];
  onAttendance: (emp: Employee) => void;
  onPayment: (emp: Employee) => void;
  onAdvance: (emp: Employee) => void;
  onLedger: (emp: Employee) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-border bg-primary text-primary-foreground">
            <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Name</th>
            <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Rate</th>
            <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Total Paid</th>
            <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Due</th>
            <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Phone</th>
            <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                No employees in this category. Add one with the button above.
              </td>
            </tr>
          ) : (
            employees.map((emp) => (
              <tr key={emp.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                <td className="px-4 py-3 font-bold">{emp.name}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  {emp.type === "Fixed"
                    ? `${formatCurrency(emp.monthlySalary!)}/mo`
                    : `${formatCurrency(emp.dailyRate!)}/day`}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-success">{formatCurrency(emp.totalPaid)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-destructive">{emp.totalDue > 0 ? formatCurrency(emp.totalDue) : "—"}</td>
                <td className="px-4 py-3 text-xs font-mono">{emp.phone}</td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onAttendance(emp)}><Calendar className="h-4 w-4 mr-2" />Attendance</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onPayment(emp)}><Banknote className="h-4 w-4 mr-2" />Payment</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAdvance(emp)}><Wallet className="h-4 w-4 mr-2" />Advance</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onLedger(emp)}><History className="h-4 w-4 mr-2" />Salary Ledger</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function Employees() {
  const { state } = useMockStore();
  const { employees: allEmployees, projects, users, currentUserId } = state;

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? users[0],
    [users, currentUserId]
  );
  const isSiteManager = currentUser?.role === "Site Manager";
  const projectFilterName = isSiteManager ? currentUser?.assignedProjectName ?? null : null;

  const [selectedProjectId, setSelectedProjectId] = useState<string>(ALL_PROJECTS);
  const [addOpen, setAddOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const employeesInScope = useMemo(() => {
    if (isSiteManager && projectFilterName) {
      return allEmployees.filter((e) => e.project === projectFilterName);
    }
    if (selectedProjectId === ALL_PROJECTS) return allEmployees;
    const proj = projects.find((p) => p.id === selectedProjectId);
    if (!proj) return allEmployees;
    return allEmployees.filter((e) => e.project === proj.name);
  }, [allEmployees, isSiteManager, projectFilterName, selectedProjectId, projects]);

  const fixedEmployees = employeesInScope.filter((e) => e.type === "Fixed");
  const dailyEmployees = employeesInScope.filter((e) => e.type === "Daily");

  const projectsForSelector = useMemo(
    () => projects.filter((p) => p.status === "Active" || p.status === "On Hold"),
    [projects]
  );

  const openAttendance = (emp: Employee) => { setSelectedEmployee(emp); setAttendanceOpen(true); };
  const openPayment = (emp: Employee) => { setSelectedEmployee(emp); setPaymentOpen(true); };
  const openAdvance = (emp: Employee) => { setSelectedEmployee(emp); setAdvanceOpen(true); };
  const openLedger = (emp: Employee) => { setSelectedEmployee(emp); setLedgerOpen(true); };

  const closeAndClear = () => {
    setAttendanceOpen(false);
    setPaymentOpen(false);
    setAdvanceOpen(false);
    setLedgerOpen(false);
    setSelectedEmployee(null);
  };

  const subtitle =
    isSiteManager && projectFilterName
      ? `Fixed salary & daily wage workers — ${projectFilterName}`
      : selectedProjectId === ALL_PROJECTS
        ? "Fixed salary & daily wage workers — All Projects"
        : `Fixed salary & daily wage workers — ${projects.find((p) => p.id === selectedProjectId)?.name ?? "Project"}`;

  return (
    <Layout>
      <PageHeader
        title="Employees"
        subtitle={subtitle}
        printTargetId="employees-table"
        actions={<Button variant="warning" size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Employee</Button>}
      />
      <AddEmployeeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        restrictedProjectId={isSiteManager ? currentUser?.assignedProjectId : undefined}
        restrictedProjectName={isSiteManager ? currentUser?.assignedProjectName : undefined}
      />
      <AttendanceDialog open={attendanceOpen} onOpenChange={(o) => { if (!o) closeAndClear(); else setAttendanceOpen(o); }} employee={selectedEmployee} />
      <EmployeePaymentDialog open={paymentOpen} onOpenChange={(o) => { if (!o) closeAndClear(); else setPaymentOpen(o); }} employee={selectedEmployee} />
      <EmployeeAdvanceDialog open={advanceOpen} onOpenChange={(o) => { if (!o) closeAndClear(); else setAdvanceOpen(o); }} employee={selectedEmployee} />
      <SalaryLedgerDialog open={ledgerOpen} onOpenChange={(o) => { if (!o) closeAndClear(); else setLedgerOpen(o); }} employee={selectedEmployee} />

      <div className="flex flex-wrap items-end gap-4 p-4 border-2 border-border mb-4">
        {!isSiteManager && (
          <div className="min-w-[200px]">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project</Label>
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROJECTS}>All Projects</SelectItem>
                {projectsForSelector.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Group employees by project</p>
          </div>
        )}
        {isSiteManager && projectFilterName && (
          <div className="min-w-[200px]">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project</Label>
            <p className="mt-1.5 text-sm font-medium">{projectFilterName}</p>
            <p className="text-xs text-muted-foreground">Your assigned project (Site Manager)</p>
          </div>
        )}
      </div>

      <Tabs defaultValue="Fixed" className="w-full">
        <TabsList className="mb-2">
          <TabsTrigger value="Fixed">Fixed Salary ({fixedEmployees.length})</TabsTrigger>
          <TabsTrigger value="Daily">Daily Wage ({dailyEmployees.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="Fixed">
          <div id="employees-table" className="border-2 border-border">
            <EmployeeTable
              employees={fixedEmployees}
              onAttendance={openAttendance}
              onPayment={openPayment}
              onAdvance={openAdvance}
              onLedger={openLedger}
            />
          </div>
        </TabsContent>
        <TabsContent value="Daily">
          <div id="employees-table" className="border-2 border-border">
            <EmployeeTable
              employees={dailyEmployees}
              onAttendance={openAttendance}
              onPayment={openPayment}
              onAdvance={openAdvance}
              onLedger={openLedger}
            />
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
