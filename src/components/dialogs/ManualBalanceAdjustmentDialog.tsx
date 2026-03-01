import { useState, useEffect } from "react";
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
import {
  createProjectBalanceAdjustment,
  updateProjectBalanceAdjustment,
  type ProjectLedgerRow,
} from "@/services/projectLedgerService";
import { toast } from "sonner";

interface ManualBalanceAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName?: string;
  currentBalance: number;
  adjustment?: ProjectLedgerRow | null; // For edit mode
  onSuccess?: () => void;
}

export function ManualBalanceAdjustmentDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  currentBalance,
  adjustment,
  onSuccess,
}: ManualBalanceAdjustmentDialogProps) {
  const isEdit = !!adjustment && adjustment.type === "manual_adjustment";
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (adjustment && adjustment.type === "manual_adjustment") {
      setDate(adjustment.date);
      setAmount(String(adjustment.amount));
      setRemarks(adjustment.remarks ?? "");
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setAmount("");
      setRemarks("");
    }
  }, [adjustment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date?.trim()) {
      toast.error("Date is required");
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt === 0) {
      toast.error("Amount must be non-zero (positive to add, negative to subtract)");
      return;
    }
    const oldAmount = isEdit ? (adjustment?.amount ?? 0) : 0;
    const newBalance = currentBalance - oldAmount + amt;
    if (newBalance < 0) {
      toast.error(`Cannot apply: project balance would become negative. Current: ${currentBalance.toLocaleString()}`);
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await updateProjectBalanceAdjustment(projectId, adjustment!.id, { date: date.trim(), amount: amt, remarks: remarks.trim() || undefined });
        toast.success("Adjustment updated");
      } else {
        await createProjectBalanceAdjustment(projectId, { date: date.trim(), amount: amt, remarks: remarks.trim() || undefined });
        toast.success("Adjustment created");
      }
      onOpenChange(false);
      setAmount("");
      setRemarks("");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save adjustment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Manual Balance Adjustment" : "Add Manual Balance Adjustment"}</DialogTitle>
        </DialogHeader>
        {projectName && (
          <p className="text-sm text-muted-foreground">
            Project: {projectName} — Current balance: {currentBalance.toLocaleString()}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Amount *</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 10000 or -5000"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Positive = add to project balance, Negative = subtract</p>
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="warning" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Save" : "Add Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
