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
import { Textarea } from "@/components/ui/textarea";
import { useMockStore } from "@/context/MockStore";
import { toast } from "sonner";
import type { Machine } from "@/lib/mock-data";

interface AddMachineLedgerEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machine: Machine;
}

export function AddMachineLedgerEntryDialog({ open, onOpenChange, machine }: AddMachineLedgerEntryDialogProps) {
  const { actions } = useMockStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hoursWorked, setHoursWorked] = useState("");
  const [usedBy, setUsedBy] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [remarks, setRemarks] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(hoursWorked);
    const paid = parseFloat(paidAmount);
    if (!date || isNaN(hours) || hours <= 0) {
      toast.error("Date and hours worked are required");
      return;
    }
    const totalCost = hours * machine.hourlyRate;
    const remaining = totalCost - (isNaN(paid) ? 0 : paid);
    actions.addMachineLedgerEntry({
      machineId: machine.id,
      date,
      hoursWorked: hours,
      usedBy: usedBy || undefined,
      totalCost,
      paidAmount: isNaN(paid) ? 0 : paid,
      remaining,
      remarks: remarks || undefined,
    });
    actions.addAuditLog({
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      user: "admin@erp.com",
      role: "Admin",
      action: "Create",
      module: "Machinery",
      description: `Machine ledger: ${machine.name} — ${hours} hrs`,
    });
    toast.success("Ledger entry added");
    onOpenChange(false);
    setHoursWorked("");
    setUsedBy("");
    setPaidAmount("");
    setRemarks("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Ledger Entry — {machine.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Hourly rate: {machine.hourlyRate} (PKR)</p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Hours Worked *</Label>
            <Input type="number" min={0.5} step={0.5} value={hoursWorked} onChange={(e) => setHoursWorked(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Used By</Label>
            <Input value={usedBy} onChange={(e) => setUsedBy(e.target.value)} placeholder="Person or site" className="mt-1" />
          </div>
          <div>
            <Label>Paid Amount</Label>
            <Input type="number" min={0} value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning">Add Entry</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
