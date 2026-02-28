import { useState } from "react";
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
}

export function AddEmployeeDialog({ open, onOpenChange, restrictedProjectId, restrictedProjectName, projects }: AddEmployeeDialogProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [type, setType] = useState<"Fixed" | "Daily">("Fixed");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const effectiveProjectId = restrictedProjectId ?? projectId;
  const effectiveProject = projects.find((p) => p.id === effectiveProjectId) ?? (restrictedProjectName ? { id: restrictedProjectId, name: restrictedProjectName } : null);

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
        });
      }
      toast.success("Employee added");
      onOpenChange(false);
      setName("");
      setRole("");
      setMonthlySalary("");
      setDailyRate("");
      setPhone("");
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
          <div>
            <Label>Role *</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Foreman, Mason" className="mt-1" />
          </div>
          <div>
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
          </div>
          <div>
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
          </div>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={submitting}>{submitting ? "Adding…" : "Add Employee"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
