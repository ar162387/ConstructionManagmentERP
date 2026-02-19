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
import type { Employee } from "@/lib/mock-data";

interface EmployeePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export function EmployeePaymentDialog({ open, onOpenChange, employee }: EmployeePaymentDialogProps) {
  const { actions } = useMockStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Bank" | "Online">("Bank");
  const [referenceId, setReferenceId] = useState("");
  const [forMonth, setForMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isLatePayment, setIsLatePayment] = useState(false);
  const [remarks, setRemarks] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    const amt = parseFloat(amount);
    if (!date || isNaN(amt) || amt <= 0) {
      toast.error("Date and amount are required");
      return;
    }
    actions.addAuditLog({
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      user: "admin@erp.com",
      role: "Admin",
      action: "Edit",
      module: "Employee",
      description: `Salary payment: ${employee.name} — ${amt.toLocaleString()}${isLatePayment ? ` (late payment for ${forMonth})` : ""}`,
      oldValue: `Due: ${employee.totalDue}`,
      newValue: `Paid: ${amt}, Mode: ${paymentMode}`,
    });
    toast.success(isLatePayment ? "Late salary payment recorded (prototype)" : "Payment recorded (prototype)");
    onOpenChange(false);
    setAmount("");
    setReferenceId("");
    setRemarks("");
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Salary Payment — {employee.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Due: {employee.totalDue.toLocaleString()} (PKR) · {employee.project}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Payment Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Amount *</Label>
            <Input type="number" min={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={employee.totalDue > 0 ? String(employee.totalDue) : ""} className="mt-1" />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="latePayment"
              checked={isLatePayment}
              onChange={(e) => setIsLatePayment(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="latePayment" className="font-normal cursor-pointer">Late salary (payment for a past month)</Label>
          </div>
          {isLatePayment && (
            <div>
              <Label>Salary For Month</Label>
              <Input type="month" value={forMonth} onChange={(e) => setForMonth(e.target.value)} className="mt-1" />
            </div>
          )}
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
          {(paymentMode === "Bank" || paymentMode === "Online") && (
            <div>
              <Label>Reference / Cheque ID</Label>
              <Input value={referenceId} onChange={(e) => setReferenceId(e.target.value)} placeholder="Optional" className="mt-1" />
            </div>
          )}
          <div>
            <Label>Remarks</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning">Record Payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
