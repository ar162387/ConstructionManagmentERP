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

interface EmployeeAdvanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export function EmployeeAdvanceDialog({ open, onOpenChange, employee }: EmployeeAdvanceDialogProps) {
  const { actions } = useMockStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Bank" | "Online">("Cash");
  const [referenceId, setReferenceId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [recoverFromMonth, setRecoverFromMonth] = useState("");

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
      action: "Create",
      module: "Employee",
      description: `Advance given: ${employee.name} — ${amt.toLocaleString()} (recover from: ${recoverFromMonth || "next salary"})`,
    });
    toast.success("Advance recorded (prototype — will deduct from salary)");
    onOpenChange(false);
    setAmount("");
    setReferenceId("");
    setRemarks("");
    setRecoverFromMonth("");
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Advance — {employee.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Advance is deducted from future salary. · {employee.project}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Advance Amount *</Label>
            <Input type="number" min={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount given" className="mt-1" />
          </div>
          <div>
            <Label>Recover from month (optional)</Label>
            <Input type="month" value={recoverFromMonth} onChange={(e) => setRecoverFromMonth(e.target.value)} placeholder="Leave empty for next salary" className="mt-1" />
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
            <Button type="submit" variant="warning">Record Advance</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
