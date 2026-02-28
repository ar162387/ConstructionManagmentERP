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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVendors } from "@/hooks/useVendors";
import { toast } from "sonner";
import { createItemLedgerEntry, updateItemLedgerEntry, type ApiItemLedgerEntry } from "@/services/itemLedgerService";

interface AddLedgerEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
  /** Used to scope vendor dropdown to this project only. */
  projectId: string;
  /** Pass existing entry to enable edit mode. */
  editEntry?: ApiItemLedgerEntry | null;
  onSuccess: () => void;
}

export function AddLedgerEntryDialog({
  open,
  onOpenChange,
  itemId,
  itemName,
  projectId,
  editEntry,
  onSuccess,
}: AddLedgerEntryDialogProps) {
  const isEdit = !!editEntry;
  const { vendors } = useVendors(projectId);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [biltyNumber, setBiltyNumber] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Bank" | "Online">("Cash");
  const [referenceId, setReferenceId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  // When dialog opens, reset form. In edit mode pre-fill all fields including vendor.
  useEffect(() => {
    if (open) {
      if (editEntry) {
        setDate(editEntry.date);
        setQuantity(String(editEntry.quantity));
        setUnitPrice(String(editEntry.unitPrice));
        setPaidAmount(String(editEntry.paidAmount));
        setVendorId(editEntry.vendorId ?? "");
        setBiltyNumber(editEntry.biltyNumber ?? "");
        setVehicleNumber(editEntry.vehicleNumber ?? "");
        setPaymentMethod(editEntry.paymentMethod);
        setReferenceId(editEntry.referenceId ?? "");
        setRemarks(editEntry.remarks ?? "");
      } else {
        setDate(new Date().toISOString().slice(0, 10));
        setQuantity("");
        setUnitPrice("");
        setPaidAmount("");
        setVendorId("");
        setBiltyNumber("");
        setVehicleNumber("");
        setPaymentMethod("Cash");
        setReferenceId("");
        setRemarks("");
      }
    }
  }, [open, editEntry]);

  // Ensure vendor is pre-selected once vendors list is loaded (fixes Select not showing value when options load async)
  useEffect(() => {
    if (open && isEdit && editEntry?.vendorId && vendors.length > 0) {
      const exists = vendors.some((v) => v.id === editEntry.vendorId);
      if (exists) setVendorId(editEntry.vendorId);
    }
  }, [open, isEdit, editEntry?.vendorId, vendors]);

  const totalPrice = (() => {
    const qty = parseInt(quantity, 10);
    const up = parseFloat(unitPrice);
    if (isNaN(qty) || isNaN(up)) return null;
    return qty * up;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    const up = parseFloat(unitPrice);
    if (!date) { toast.error("Date is required"); return; }
    if (isNaN(qty) || qty < 1) { toast.error("Quantity must be at least 1"); return; }
    if (isNaN(up) || up < 0) { toast.error("Unit price must be >= 0"); return; }
    if (!vendorId) { toast.error("Please select a vendor"); return; }

    const total = qty * up;
    const paid = paidAmount === "" ? 0 : parseFloat(paidAmount);
    if (isNaN(paid) || paid < 0) { toast.error("Paid amount must be >= 0"); return; }
    if (paid > total) { toast.error("Paid amount cannot exceed total price"); return; }

    setLoading(true);
    try {
      const payload = {
        vendorId,
        date,
        quantity: qty,
        unitPrice: up,
        paidAmount: paid,
        biltyNumber: biltyNumber || undefined,
        vehicleNumber: vehicleNumber || undefined,
        paymentMethod,
        referenceId: paymentMethod !== "Cash" ? referenceId || undefined : undefined,
        remarks: remarks || undefined,
      };

      if (isEdit && editEntry) {
        await updateItemLedgerEntry(itemId, editEntry.id, payload);
        toast.success("Ledger entry updated");
      } else {
        await createItemLedgerEntry(itemId, payload);
        toast.success("Ledger entry added");
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Ledger Entry" : `Add Ledger Entry — ${itemName}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity Added *</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Unit Price *</Label>
              <Input type="number" min={0} step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="mt-1" />
            </div>
          </div>
          {totalPrice !== null && (
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-bold">{totalPrice.toLocaleString()} PKR</span>
            </p>
          )}
          <div>
            <Label>Paid Amount <span className="text-muted-foreground">(optional — leave blank for unpaid)</span></Label>
            <Input
              type="number"
              min={0}
              max={totalPrice ?? undefined}
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="0"
              className="mt-1"
            />
            {totalPrice !== null && paidAmount !== "" && (
              <p className="text-xs text-muted-foreground mt-1">
                Due: {Math.max(0, totalPrice - (parseFloat(paidAmount) || 0)).toLocaleString()} PKR
              </p>
            )}
          </div>
          <div>
            <Label>Vendor *</Label>
            <Select
              key={isEdit ? `edit-${editEntry?.id ?? ""}-${vendors.length}` : "add"}
              value={vendorId}
              onValueChange={setVendorId}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {vendors.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No vendors for this project. Add a vendor first.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bilty Number</Label>
              <Input value={biltyNumber} onChange={(e) => setBiltyNumber(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Vehicle Number</Label>
              <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} className="mt-1" />
            </div>
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
          {(paymentMethod === "Bank" || paymentMethod === "Online") && (
            <div>
              <Label>Reference / Cheque ID</Label>
              <Input value={referenceId} onChange={(e) => setReferenceId(e.target.value)} placeholder="Cheque or TXN ID" className="mt-1" />
            </div>
          )}
          <div>
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={loading}>
              {loading ? "Saving…" : isEdit ? "Save Changes" : "Add Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
