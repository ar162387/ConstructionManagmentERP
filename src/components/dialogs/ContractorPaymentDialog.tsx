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
import { createContractorPayment } from "@/services/contractorLedgerService";
import type { ApiContractorWithTotals } from "@/services/contractorsService";
import { toast } from "sonner";

interface ContractorPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractor: ApiContractorWithTotals | null;
  /** Remaining balance (overall) for validation. Backend enforces amount <= remaining. */
  remainingBalance?: number;
  onSuccess?: () => void;
}

export function ContractorPaymentDialog({
  open,
  onOpenChange,
  contractor,
  remainingBalance = 0,
  onSuccess,
}: ContractorPaymentDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Bank" | "Online">("Bank");
  const [referenceId, setReferenceId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractor) return;
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
      await createContractorPayment(contractor.id, {
        date,
        amount: amt,
        paymentMethod: paymentMode,
        referenceId: referenceId.trim() || undefined,
      });
      toast.success("Payment recorded");
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

  if (!contractor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment — {contractor.name}</DialogTitle>
          {remainingBalance > 0 && (
            <p className="text-sm text-muted-foreground">Remaining balance: {remainingBalance.toLocaleString()} PKR</p>
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
              placeholder={remainingBalance > 0 ? String(remainingBalance) : ""}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Payment Mode *</Label>
            <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as "Cash" | "Bank" | "Online")}>
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
            <Label>Cheque / Reference ID (optional)</Label>
            <Input value={referenceId} onChange={(e) => setReferenceId(e.target.value)} placeholder="e.g. CHQ-1234" className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={submitting || remainingBalance <= 0}>Record Payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
