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

interface AddMachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMachineDialog({ open, onOpenChange }: AddMachineDialogProps) {
  const { actions } = useMockStore();
  const [name, setName] = useState("");
  const [ownership, setOwnership] = useState<"Company Owned" | "Rented">("Rented");
  const [hourlyRate, setHourlyRate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Machine name is required");
      return;
    }
    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate < 0) {
      toast.error("Valid hourly rate required");
      return;
    }
    actions.addMachine({
      name: name.trim(),
      ownership,
      hourlyRate: rate,
      totalHours: 0,
      totalCost: 0,
      totalPaid: 0,
      totalPending: 0,
    });
    actions.addAuditLog({
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      user: "admin@erp.com",
      role: "Admin",
      action: "Create",
      module: "Machinery",
      description: `Added machine: ${name.trim()}`,
    });
    toast.success("Machine added");
    onOpenChange(false);
    setName("");
    setHourlyRate("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Machine</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tower Crane TC-200" className="mt-1" />
          </div>
          <div>
            <Label>Ownership *</Label>
            <Select value={ownership} onValueChange={(v) => setOwnership(v as "Company Owned" | "Rented")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Company Owned">Company Owned</SelectItem>
                <SelectItem value="Rented">Rented</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Hourly Rate *</Label>
            <Input type="number" min={0} value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning">Add Machine</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
