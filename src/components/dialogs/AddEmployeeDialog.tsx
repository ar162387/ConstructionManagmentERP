import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEmployee } from "@/services/employeesService";
import { toast } from "sonner";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set (e.g. Site Manager), project is fixed to this and selector is hidden */
  restrictedProjectId?: string;
  restrictedProjectName?: string;
  projects: { id: string; name: string }[];
  category?: "Regular" | "Machinery";
  machines?: { id: string; name: string }[];
}

function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function AddEmployeeDialog({ open, onOpenChange, restrictedProjectId, restrictedProjectName, projects, category = "Regular", machines = [] }: AddEmployeeDialogProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [type, setType] = useState<"Fixed" | "Daily">("Fixed");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [phone, setPhone] = useState("");
  const [joiningDate, setJoiningDate] = useState(todayDateString());
  const [endingDate, setEndingDate] = useState("");
  const [machineId, setMachineId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const effectiveProjectId = restrictedProjectId ?? projectId;
  const effectiveProject = projects.find((p) => p.id === effectiveProjectId) ?? (restrictedProjectName ? { id: restrictedProjectId, name: restrictedProjectName } : null);

  useEffect(() => {
    if (category === "Machinery") setType("Fixed");
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!role.trim()) {
      toast.error("Role is required");
      return;
    }
    if (!effectiveProjectId && !restrictedProjectId) {
      toast.error("Select a project");
      return;
    }
    if (category === "Machinery" && !machineId) {
      toast.error("Select the Company Owned machine that will pay this employee's salary");
      return;
    }
    if (endingDate.trim() && joiningDate.trim() && endingDate.trim() < joiningDate.trim()) {
      toast.error("Ending date cannot be before joining date");
      return;
    }
    setSubmitting(true);
    try {
      if (type === "Fixed") {
        const sal = parseFloat(monthlySalary);
        if (isNaN(sal) || sal <= 0) {
          toast.error("Valid monthly salary required");
          setSubmitting(false);
          return;
        }
        await createEmployee({
          projectId: effectiveProjectId ?? projectId,
          name: name.trim(),
          role: role.trim(),
          type: "Fixed",
          monthlySalary: sal,
          phone: phone.trim(),
          joiningDate: joiningDate.trim() || undefined,
          endingDate: endingDate.trim() || undefined,
          category,
          machineId: category === "Machinery" ? machineId : undefined,
        });
      } else {
        const rate = parseFloat(dailyRate);
        if (isNaN(rate) || rate <= 0) {
          toast.error("Valid daily rate required");
          setSubmitting(false);
          return;
        }
        await createEmployee({
          projectId: effectiveProjectId ?? projectId,
          name: name.trim(),
          role: role.trim(),
          type: "Daily",
          dailyRate: rate,
          phone: phone.trim(),
          joiningDate: joiningDate.trim() || undefined,
          endingDate: endingDate.trim() || undefined,
          category,
          machineId: category === "Machinery" ? machineId : undefined,
        });
      }
      toast.success("Employee added");
      setName("");
      setRole("");
      setMonthlySalary("");
      setDailyRate("");
      setPhone("");
      setJoiningDate(todayDateString());
      setEndingDate("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add employee");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Employee name" className="mt-1" />
          </div>
          {category === "Machinery" && (
            <div>
              <Label>Assigned Company Owned Machine *</Label>
              <Select value={machineId} onValueChange={setMachineId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select machine" /></SelectTrigger>
                <SelectContent>{machines.map((machine) => <SelectItem key={machine.id} value={machine.id}>{machine.name}</SelectItem>)}</SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">Salary and advance payments will be deducted from this machine only.</p>
            </div>
          )}
          <div>
            <Label>Role *</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Foreman, Mason" className="mt-1" />
          </div>
          {category !== "Machinery" ? <div>
            <Label>Type *</Label>
            <Select value={type} onValueChange={(v) => setType(v as "Fixed" | "Daily")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fixed">Fixed Monthly Salary</SelectItem>
                <SelectItem value="Daily">Daily Wage</SelectItem>
              </SelectContent>
            </Select>
          </div> : <div>
            <Label>Type</Label>
            <p className="mt-1.5 text-sm font-medium">Fixed Monthly Salary</p>
          </div>}
          {category !== "Machinery" && <div>
            <Label>Project *</Label>
            {restrictedProjectId && restrictedProjectName ? (
              <p className="mt-1.5 text-sm font-medium">{restrictedProjectName}</p>
            ) : (
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>}
          {type === "Fixed" && (
            <div>
              <Label>Monthly Salary *</Label>
              <Input type="number" min={1} value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} className="mt-1" />
            </div>
          )}
          {type === "Daily" && (
            <div>
              <Label>Daily Rate (8 hrs = 1 day) *</Label>
              <Input type="number" min={1} value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} className="mt-1" />
            </div>
          )}
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 ..." className="mt-1" />
          </div>
          <div>
            <Label>Joining Date</Label>
            <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} className="mt-1" />
            <p className="mt-1 text-xs text-muted-foreground">
              The date the employee actually started. Salary/attendance data before this month will show "No Data".
            </p>
          </div>
          <div>
            <Label>Ending Date</Label>
            <Input type="date" value={endingDate} onChange={(e) => setEndingDate(e.target.value)} className="mt-1" />
            <p className="mt-1 text-xs text-muted-foreground">
              {category === "Machinery"
                ? "The date this machinery employee left. Salary is prorated up to this date, and no salary or liability is generated after it."
                : type === "Fixed"
                  ? "The date the employee left. Salary is prorated up to this date, and no salary or liability is generated after it."
                  : "The date the employee left. Wages still depend on marked attendance, but this records that they're no longer with the company."}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={submitting}>{submitting ? "Adding…" : "Add Employee"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
