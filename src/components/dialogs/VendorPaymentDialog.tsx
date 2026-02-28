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
import { toast } from "sonner";
import { createVendorPayment } from "@/services/vendorPaymentService";
import type { ApiVendor } from "@/services/vendorsService";

interface VendorPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: ApiVendor;
  onSuccess: () => void;
}

export function VendorPaymentDialog({ open, onOpenChange, vendor, onSuccess }: VendorPaymentDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Bank" | "Online">("Bank");
  const [referenceId, setReferenceId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!date) { toast.error("Date is required"); return; }
    if (isNaN(amt) || amt <= 0) { toast.error("Amount must be positive"); return; }
    if (amt > vendor.remaining) {
      toast.error(`Amount ${amt.toLocaleString()} exceeds pending dues of ${vendor.remaining.toLocaleString()} PKR`);
      return;
    }
    setLoading(true);
    try {
      await createVendorPayment(vendor.id, {
        date,
        amount: amt,
        paymentMethod: paymentMode,
        referenceId: paymentMode !== "Cash" ? referenceId || undefined : undefined,
        remarks: remarks || undefined,
      });
      toast.success("Payment recorded");
      onSuccess();
      setAmount("");
      setReferenceId("");
      setRemarks("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment — {vendor.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Pending dues: <span className="font-bold text-destructive">{formatAmount(vendor.remaining)} PKR</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Amount *</Label>
            <Input
              type="number"
              min={0.01}
              max={vendor.remaining}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
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
            <Button type="submit" variant="warning" disabled={loading || vendor.remaining <= 0}>
              {loading ? "Recording…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatAmount(n: number): string {
  return n.toLocaleString();
}
