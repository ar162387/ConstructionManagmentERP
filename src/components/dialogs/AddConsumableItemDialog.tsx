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
import { useMockStore } from "@/context/MockStore";
import { toast } from "sonner";

interface AddConsumableItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddConsumableItemDialog({ open, onOpenChange }: AddConsumableItemDialogProps) {
  const { actions } = useMockStore();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (!unit.trim()) {
      toast.error("Unit is required");
      return;
    }
    actions.addConsumableItem({
      name: name.trim(),
      unit: unit.trim(),
      currentStock: 0,
      totalPurchased: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalPending: 0,
    });
    actions.addAuditLog({
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      user: "admin@erp.com",
      role: "Admin",
      action: "Create",
      module: "Consumable Inventory",
      description: `Added item: ${name.trim()} (${unit.trim()})`,
    });
    toast.success("Item added");
    onOpenChange(false);
    setName("");
    setUnit("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Consumable Item (Item Master)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Item Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cement" className="mt-1" />
          </div>
          <div>
            <Label>Unit *</Label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. bag, kg, piece, cft" className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning">Add Item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
