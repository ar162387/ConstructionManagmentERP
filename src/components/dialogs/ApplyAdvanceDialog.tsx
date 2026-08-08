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
import { toast } from "sonner";
import { createVendorPayment } from "@/services/vendorPaymentService";
import { createItemLedgerEntry } from "@/services/itemLedgerService";
import { useConsumableItems } from "@/hooks/useConsumableItems";
import type { ApiVendor } from "@/services/vendorsService";

const NONE_ITEM = "__none__";

interface ApplyAdvanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: ApiVendor;
  onSuccess: () => void;
}

/** Settles an outstanding due by drawing down the vendor's existing advance balance instead
 *  of recording fresh money. Optionally records the delivered material (adding it to stock)
 *  at the same time — e.g. once a previously-prepaid delivery finally arrives. */
export function ApplyAdvanceDialog({ open, onOpenChange, vendor, onSuccess }: ApplyAdvanceDialogProps) {
  const { items } = useConsumableItems(vendor.projectId);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [itemId, setItemId] = useState<string>(NONE_ITEM);
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().slice(0, 10));
      setItemId(NONE_ITEM);
      setQuantity("");
      setUnitPrice("");
      setAmount("");
      setAmountTouched(false);
      setRemarks("");
    }
  }, [open]);

  const totalPrice = (() => {
    if (itemId === NONE_ITEM) return null;
    const qty = parseInt(quantity, 10);
    const up = parseFloat(unitPrice);
    if (isNaN(qty) || isNaN(up)) return null;
    return qty * up;
  })();

  // When recording a new delivery, that bill's own total adds to what's owed before the
  // advance settles it — so the applicable cap must account for it, not just today's remaining.
  const projectedRemaining = totalPrice !== null ? vendor.remaining + totalPrice : vendor.remaining;
  const maxApplicable = Math.min(projectedRemaining, vendor.advanceBalance);

  // Once a delivery total is known, default the amount to apply to the smaller of the bill
  // and what's actually applicable — unless the user has already edited it themselves.
  useEffect(() => {
    if (amountTouched) return;
    if (totalPrice !== null) {
      setAmount(String(Math.min(totalPrice, maxApplicable)));
    } else if (itemId === NONE_ITEM) {
      setAmount(String(maxApplicable > 0 ? maxApplicable : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPrice, itemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!date) { toast.error("Date is required"); return; }
    if (isNaN(amt) || amt <= 0) { toast.error("Amount must be positive"); return; }
    if (amt > maxApplicable) {
      toast.error(`Amount ${amt.toLocaleString()} exceeds the applicable advance of ${maxApplicable.toLocaleString()} PKR`);
      return;
    }
    const hasItem = itemId !== NONE_ITEM;
    let qty = 0;
    let up = 0;
    if (hasItem) {
      qty = parseInt(quantity, 10);
      up = parseFloat(unitPrice);
      if (isNaN(qty) || qty < 1) { toast.error("Quantity must be at least 1"); return; }
      if (isNaN(up) || up < 0) { toast.error("Unit price must be >= 0"); return; }
    }

    setLoading(true);
    try {
      let targetEntryId: string | undefined;
      if (hasItem) {
        // Record the delivered material first (adds it to stock, unpaid), then settle it
        // from the vendor's advance balance — pinned to this entry so FIFO can't redirect
        // the advance to an older, unrelated bill and leave this delivery looking unpaid.
        const entry = await createItemLedgerEntry(itemId, {
          vendorId: vendor.id,
          date,
          quantity: qty,
          unitPrice: up,
          paidAmount: 0,
          paymentMethod: "Cash",
          remarks: remarks || undefined,
        });
        targetEntryId = entry.id;
      }
      const itemName = hasItem ? items.find((it) => it.id === itemId)?.name : undefined;
      await createVendorPayment(vendor.id, {
        date,
        amount: amt,
        paymentMethod: "Cash",
        source: "advance",
        targetEntryId,
        remarks:
          remarks ||
          (hasItem ? `Advance applied to delivery — ${itemName ?? "item"}` : undefined),
      });
      toast.success(hasItem ? "Delivery recorded and settled from advance" : "Advance applied");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply advance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply Advance — {vendor.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Available advance: <span className="font-bold text-success">{vendor.advanceBalance.toLocaleString()} PKR</span>
          {" · "}Pending dues: <span className="font-bold text-destructive">{vendor.remaining.toLocaleString()} PKR</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Delivered Item <span className="text-muted-foreground">(optional — record material that just arrived)</span></Label>
            <Select value={itemId} onValueChange={(v) => { setItemId(v); setAmountTouched(false); }}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="None — just settle existing dues" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_ITEM}>None — just settle existing dues</SelectItem>
                {items.map((it) => (
                  <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {itemId !== NONE_ITEM && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity *</Label>
                <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Unit Price *</Label>
                <Input type="number" min={0} step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="mt-1" />
              </div>
            </div>
          )}
          {totalPrice !== null && (
            <p className="text-sm text-muted-foreground">
              Bill total: <span className="font-bold">{totalPrice.toLocaleString()} PKR</span>
            </p>
          )}
          <div>
            <Label>Amount to Apply from Advance *</Label>
            <Input
              type="number"
              min={0.01}
              max={maxApplicable}
              step="0.01"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setAmountTouched(true); }}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Max applicable: {maxApplicable.toLocaleString()} PKR
              {totalPrice !== null && totalPrice > maxApplicable && " — the rest of this bill will remain due"}
            </p>
          </div>
          <div>
            <Label>Remarks</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={loading || maxApplicable <= 0}>
              {loading ? "Applying…" : "Apply Advance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
