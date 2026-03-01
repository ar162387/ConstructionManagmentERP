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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLocalMonthKey } from "@/lib/employee-ledger";
import { formatCurrency } from "@/lib/mock-data";
import { getEmployeeLedger, createEmployeePayment } from "@/services/employeeLedgerService";
import type { ApiEmployeeWithSnapshot } from "@/services/employeesService";
import type { ApiMonthlySnapshot } from "@/services/employeeLedgerService";
import { toast } from "sonner";

interface EmployeeLiabilityPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: ApiEmployeeWithSnapshot | null;
  onSuccess?: () => void;
}

const INVALID_MONTH_MESSAGE =
  "No dues for this month. The employee did not exist or has no remaining amount. Select a month with a positive remaining balance.";

export function EmployeeLiabilityPaymentDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: EmployeeLiabilityPaymentDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(getLocalMonthKey());
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Bank" | "Online">("Bank");
  const [referenceId, setReferenceId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [snapshot, setSnapshot] = useState<ApiMonthlySnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const currentMonthMax = getLocalMonthKey();
  const isValidMonth = snapshot != null && snapshot.payable > 0 && snapshot.remaining > 0;
  const amountNum = parseFloat(amount.replace(/,/g, "").trim());
  const amountValid = Number.isFinite(amountNum) && amountNum > 0 && snapshot != null && amountNum <= snapshot.remaining;
  const canSubmit = isValidMonth && !submitting && amountValid;

  const handleMonthChange = (value: string) => {
    if (value > currentMonthMax) setMonth(currentMonthMax);
    else setMonth(value);
  };

  useEffect(() => {
    if (!open || !employee) {
      setSnapshot(null);
      setSnapshotError(null);
      return;
    }
    setMonth(getLocalMonthKey());
    setAmount("");
  }, [open, employee?.id]);

  useEffect(() => {
    if (snapshot && snapshot.remaining > 0) {
      setAmount(String(Math.round(snapshot.remaining)));
    }
  }, [month, snapshot?.remaining, snapshot?.payable]);

  useEffect(() => {
    if (!open || !employee) return;
    let cancelled = false;
    setSnapshotLoading(true);
    setSnapshotError(null);
    getEmployeeLedger(employee.id, { month, pageSize: 1 })
      .then((res) => {
        if (cancelled) return;
        setSnapshot(res.snapshot ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setSnapshot(null);
        setSnapshotError(err instanceof Error ? err.message : "Failed to load month data");
        toast.error("Could not load dues for this month");
      })
      .finally(() => {
        if (!cancelled) setSnapshotLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, employee?.id, month]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    const amt = parseFloat(amount.replace(/,/g, "").trim());
    if (!date || !Number.isFinite(amt) || amt <= 0) {
      toast.error("Date and amount are required");
      return;
    }
    if (!snapshot || snapshot.remaining <= 0) {
      toast.error(INVALID_MONTH_MESSAGE);
      return;
    }
    if (amt > snapshot.remaining) {
      toast.error(`Amount cannot exceed remaining due (${formatCurrency(snapshot.remaining)})`);
      return;
    }
    // All payments from Liabilities are recorded as Salary (advance cannot be paid here)
    const type = "Salary";
    setSubmitting(true);
    try {
      await createEmployeePayment(employee.id, {
        month,
        date,
        amount: amt,
        type,
        paymentMethod: paymentMode,
        remarks: remarks.trim() || undefined,
      });
      toast.success("Payment recorded");
      onSuccess?.();
      onOpenChange(false);
      setAmount("");
      setRemarks("");
      setReferenceId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment — {employee.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {employee.type} · {employee.project ?? ""}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Month *</Label>
            <Input
              type="month"
              value={month}
              max={currentMonthMax}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="mt-1"
            />
          </div>

          {snapshotLoading ? (
            <p className="text-sm text-muted-foreground">Loading dues for selected month…</p>
          ) : snapshotError ? (
            <p className="text-sm text-destructive">{snapshotError}</p>
          ) : snapshot != null ? (
            <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Payable</span>
                <span className="font-mono">{formatCurrency(snapshot.payable)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-mono text-success">{formatCurrency(snapshot.paid)}</span>
              </div>
              <div className="flex justify-between gap-2 font-medium">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-mono text-destructive">{formatCurrency(snapshot.remaining)}</span>
              </div>
            </div>
          ) : null}

          {!snapshotLoading && snapshot != null && !isValidMonth && (
            <p className="text-sm text-destructive">{INVALID_MONTH_MESSAGE}</p>
          )}

          <div>
            <Label>Payment date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Amount *</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={snapshot && snapshot.remaining > 0 ? String(Math.round(snapshot.remaining)) : "0"}
              className="mt-1"
            />
            {snapshot && snapshot.remaining > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Remaining for this month: {formatCurrency(snapshot.remaining)}
              </p>
            )}
          </div>
          <div>
            <Label>Payment method *</Label>
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
          {(paymentMode === "Bank" || paymentMode === "Online") && (
            <div>
              <Label>Reference / cheque ID</Label>
              <Input value={referenceId} onChange={(e) => setReferenceId(e.target.value)} placeholder="Optional" className="mt-1" />
            </div>
          )}
          <div>
            <Label>Remarks</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="warning" disabled={!canSubmit}>
              {submitting ? "Saving…" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
