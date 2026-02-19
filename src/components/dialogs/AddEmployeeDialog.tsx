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
import { useMockStore } from "@/context/MockStore";
import { toast } from "sonner";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEmployeeDialog({ open, onOpenChange }: AddEmployeeDialogProps) {
  const { state, actions } = useMockStore();
  const [name, setName] = useState("");
  const [type, setType] = useState<"Fixed" | "Daily">("Fixed");
  const [projectId, setProjectId] = useState(state.projects[0]?.id || "");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [phone, setPhone] = useState("");

  const projects = state.projects;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!projectId) {
      toast.error("Select a project");
      return;
    }
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      toast.error("Invalid project");
      return;
    }
    if (type === "Fixed") {
      const sal = parseFloat(monthlySalary);
      if (isNaN(sal) || sal <= 0) {
        toast.error("Valid monthly salary required");
        return;
      }
      actions.addEmployee({
        name: name.trim(),
        type: "Fixed",
        project: project.name,
        monthlySalary: sal,
        phone: phone.trim(),
        totalPaid: 0,
        totalDue: 0,
      });
    } else {
      const rate = parseFloat(dailyRate);
      if (isNaN(rate) || rate <= 0) {
        toast.error("Valid daily rate required");
        return;
      }
      actions.addEmployee({
        name: name.trim(),
        type: "Daily",
        project: project.name,
        dailyRate: rate,
        phone: phone.trim(),
        totalPaid: 0,
        totalDue: 0,
      });
    }
    actions.addAuditLog({
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      user: "admin@erp.com",
      role: "Admin",
      action: "Create",
      module: "Employee",
      description: `Added employee: ${name.trim()}`,
    });
    toast.success("Employee added");
    onOpenChange(false);
    setName("");
    setMonthlySalary("");
    setDailyRate("");
    setPhone("");
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning">Add Employee</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
