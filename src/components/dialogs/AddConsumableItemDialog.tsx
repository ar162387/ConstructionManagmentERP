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
import { createConsumableItem } from "@/services/consumableItemsService";
import { toast } from "sonner";

interface AddConsumableItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  onSuccess: () => void;
}

export function AddConsumableItemDialog({ open, onOpenChange, projectId, onSuccess }: AddConsumableItemDialogProps) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Item name is required"); return; }
    if (!unit.trim()) { toast.error("Unit is required"); return; }
    if (!projectId) { toast.error("No project selected"); return; }
    setLoading(true);
    try {
      await createConsumableItem({ projectId, name: name.trim(), unit: unit.trim() });
      toast.success("Item added");
      onSuccess();
      onOpenChange(false);
      setName("");
      setUnit("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Consumable Item</DialogTitle>
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
            <Button type="submit" variant="warning" disabled={loading}>{loading ? "Adding…" : "Add Item"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
