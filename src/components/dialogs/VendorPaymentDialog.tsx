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
import type { Vendor } from "@/lib/mock-data";

interface VendorPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor;
}

export function VendorPaymentDialog({ open, onOpenChange, vendor }: VendorPaymentDialogProps) {
  const { actions } = useMockStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Bank" | "Online">("Bank");
  const [referenceId, setReferenceId] = useState("");
  const [remarks, setRemarks] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!date || isNaN(amt) || amt <= 0) {
      toast.error("Date and amount are required");
      return;
    }
    if (amt > vendor.remaining) {
      toast.error("Amount cannot exceed pending dues");
      return;
    }
    actions.addAuditLog({
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      user: "admin@erp.com",
      role: "Admin",
      action: "Edit",
      module: "Vendor",
      description: `Vendor payment: ${vendor.name} — ${amt}`,
      oldValue: `Pending: ${vendor.remaining}`,
      newValue: `Paid: ${amt}`,
    });
    toast.success("Payment recorded (prototype: ledger not updated)");
    onOpenChange(false);
    setAmount("");
    setReferenceId("");
    setRemarks("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment — {vendor.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Pending: {vendor.remaining.toLocaleString()} (PKR)</p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Amount *</Label>
            <Input type="number" min={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Payment Mode</Label>
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
              <Input value={referenceId} onChange={(e) => setReferenceId(e.target.value)} className="mt-1" />
            </div>
          )}
          <div>
            <Label>Remarks</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="mt-1" />
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
