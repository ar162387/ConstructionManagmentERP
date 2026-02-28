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
import { createMachinePayment } from "@/services/machinesService";
import type { ApiMachineWithTotals } from "@/services/machinesService";
import { toast } from "sonner";

interface MachinePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machine: ApiMachineWithTotals | null;
  /** Remaining balance for validation. Backend enforces amount <= remaining. */
  remainingBalance?: number;
  onSuccess?: () => void;
}

export function MachinePaymentDialog({
  open,
  onOpenChange,
  machine,
  remainingBalance = 0,
  onSuccess,
}: MachinePaymentDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Bank" | "Online">("Bank");
  const [referenceId, setReferenceId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machine) return;
    const amt = parseFloat(amount);
    if (!date || isNaN(amt) || amt <= 0) {
      toast.error("Date and amount are required");
      return;
    }
    if (amt > remainingBalance) {
      toast.error(`Amount exceeds remaining balance of ${remainingBalance.toLocaleString()} PKR`);
      return;
    }
    setSubmitting(true);
    try {
      await createMachinePayment(machine.id, {
        date,
        amount: amt,
        paymentMethod,
        referenceId: referenceId.trim() || undefined,
      });
      toast.success("Payment recorded (FIFO applied)");
      onOpenChange(false);
      setAmount("");
      setReferenceId("");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!machine) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment — {machine.name}</DialogTitle>
          {remainingBalance > 0 && (
            <p className="text-sm text-muted-foreground">Remaining balance: {remainingBalance.toLocaleString()} PKR. Payment will be applied to oldest dues first (FIFO).</p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Payment Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Amount *</Label>
            <Input
              type="number"
              min={0.01}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "Cash" | "Bank" | "Online")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Bank">Bank</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reference ID</Label>
            <Input value={referenceId} onChange={(e) => setReferenceId(e.target.value)} placeholder="Optional" className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={submitting || remainingBalance <= 0}>
              {submitting ? "Recording…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
