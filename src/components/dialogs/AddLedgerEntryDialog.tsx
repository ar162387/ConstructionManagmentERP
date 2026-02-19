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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMockStore } from "@/context/MockStore";
import { toast } from "sonner";
import type { LedgerEntry } from "@/lib/mock-data";

interface AddLedgerEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
}

export function AddLedgerEntryDialog({ open, onOpenChange, itemId, itemName }: AddLedgerEntryDialogProps) {
  const { state, actions } = useMockStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [vendorId, setVendorId] = useState("");
  const [biltyNumber, setBiltyNumber] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Bank" | "Online">("Cash");
  const [referenceId, setReferenceId] = useState("");
  const [remarks, setRemarks] = useState("");

  const vendors = state.vendors;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    const up = parseFloat(unitPrice);
    const paid = parseFloat(paidAmount);
    if (!date || isNaN(qty) || qty <= 0 || isNaN(up) || up < 0) {
      toast.error("Date, quantity and unit price are required");
      return;
    }
    const totalPrice = qty * up;
    const remaining = totalPrice - (isNaN(paid) ? 0 : paid);
    const vendor = vendors.find((v) => v.id === vendorId);
    if (!vendor) {
      toast.error("Please select a vendor");
      return;
    }
    const entry: Omit<LedgerEntry, "id"> = {
      date,
      quantity: qty,
      unitPrice: up,
      totalPrice,
      paidAmount: isNaN(paid) ? 0 : paid,
      remaining,
      vendor: vendor.name,
      biltyNumber: biltyNumber || undefined,
      vehicleNumber: vehicleNumber || undefined,
      paymentMethod,
      referenceId: paymentMethod !== "Cash" ? referenceId || undefined : undefined,
      remarks: remarks || undefined,
    };
    actions.addLedgerEntry(itemId, entry);
    actions.addAuditLog({
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      user: "admin@erp.com",
      role: "Admin",
      action: "Create",
      module: "Consumable Inventory",
      description: `Added ledger entry: ${itemName} - ${qty} @ ${up}`,
    });
    toast.success("Ledger entry added");
    onOpenChange(false);
    setQuantity("");
    setUnitPrice("");
    setPaidAmount("0");
    setVendorId("");
    setBiltyNumber("");
    setVehicleNumber("");
    setReferenceId("");
    setRemarks("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Ledger Entry — {itemName}</DialogTitle>
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
          <div>
            <Label>Paid Amount</Label>
            <Input type="number" min={0} value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Vendor *</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" variant="warning">Add Entry</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
