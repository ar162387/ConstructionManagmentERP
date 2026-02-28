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
import { updateConsumableItem, type ApiConsumableItem } from "@/services/consumableItemsService";
import { toast } from "sonner";

interface EditConsumableItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ApiConsumableItem | null;
  onSave: () => void;
}

export function EditConsumableItemDialog({ open, onOpenChange, item, onSave }: EditConsumableItemDialogProps) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setUnit(item.unit);
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!name.trim()) { toast.error("Item name is required"); return; }
    if (!unit.trim()) { toast.error("Unit is required"); return; }
    setLoading(true);
    try {
      await updateConsumableItem(item.id, { name: name.trim(), unit: unit.trim() });
      toast.success("Item updated");
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Consumable Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Item Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Unit *</Label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={loading}>{loading ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
