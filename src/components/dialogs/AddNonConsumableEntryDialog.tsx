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
import type { NonConsumableEventType } from "@/lib/mock-data";

const EVENT_TYPES: NonConsumableEventType[] = [
  "Purchase/Add Stock",
  "Assign to Project",
  "Return to Company",
  "Transfer Project → Project",
  "Repair / Maintenance",
  "Mark Lost",
  "Mark Damaged (Still usable)",
  "Mark Damaged (Not usable)",
];

const NONE_VENDOR_VALUE = "__none__";

interface AddNonConsumableEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
}

export function AddNonConsumableEntryDialog({ open, onOpenChange, itemId, itemName }: AddNonConsumableEntryDialogProps) {
  const { state, actions } = useMockStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventType, setEventType] = useState<NonConsumableEventType>("Purchase/Add Stock");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [projectTo, setProjectTo] = useState("");
  const [projectFrom, setProjectFrom] = useState("");
  const [remarks, setRemarks] = useState("");

  const projects = state.projects;
  const vendors = state.vendors;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!date || isNaN(qty) || qty <= 0) {
      toast.error("Date and quantity are required");
      return;
    }
    const needsCost = eventType === "Purchase/Add Stock" || eventType === "Repair / Maintenance";
    const cost = needsCost ? parseFloat(unitPrice) : undefined;
    if (needsCost && (isNaN(cost!) || cost! < 0)) {
      toast.error("Cost is required for this event type");
      return;
    }
    const projectToName = projectTo ? projects.find((p) => p.id === projectTo)?.name : undefined;
    const projectFromName = projectFrom ? projects.find((p) => p.id === projectFrom)?.name : undefined;
    if (eventType === "Assign to Project" && !projectToName) {
      toast.error("Select project to assign to");
      return;
    }
    if (eventType === "Transfer Project → Project" && (!projectFromName || !projectToName)) {
      toast.error("Select source and destination project");
      return;
    }
    actions.addNonConsumableLedgerEntry({
      itemId,
      date,
      eventType,
      quantity: qty,
      unitPrice: cost,
      cost: cost,
      vendorName: vendorName || undefined,
      projectFrom: projectFromName,
      projectTo: projectToName,
      remarks: remarks || undefined,
      createdBy: "admin@erp.com",
    });
    actions.addAuditLog({
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      user: "admin@erp.com",
      role: "Admin",
      action: "Create",
      module: "Non-Consumable Inventory",
      description: `${eventType}: ${itemName} x ${qty}`,
    });
    toast.success("Entry added");
    onOpenChange(false);
    setQuantity("");
    setUnitPrice("");
    setVendorName("");
    setProjectTo("");
    setProjectFrom("");
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
          <div>
            <Label>Event Type *</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as NonConsumableEventType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity *</Label>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1" />
          </div>
          {(eventType === "Purchase/Add Stock" || eventType === "Repair / Maintenance") && (
            <div>
              <Label>Cost / Unit Price *</Label>
              <Input type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="mt-1" />
            </div>
          )}
          <div>
            <Label>Vendor (optional)</Label>
            <Select
              value={vendorName || NONE_VENDOR_VALUE}
              onValueChange={(v) => setVendorName(v === NONE_VENDOR_VALUE ? "" : v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select or leave blank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VENDOR_VALUE}>—</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {eventType === "Assign to Project" && (
            <div>
              <Label>Assign to Project *</Label>
              <Select value={projectTo} onValueChange={setProjectTo}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {eventType === "Transfer Project → Project" && (
            <>
              <div>
                <Label>From Project *</Label>
                <Select value={projectFrom} onValueChange={setProjectFrom}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="From" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Project *</Label>
                <Select value={projectTo} onValueChange={setProjectTo}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="To" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
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
