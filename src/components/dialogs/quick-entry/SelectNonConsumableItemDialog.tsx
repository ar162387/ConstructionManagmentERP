import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ApiNonConsumableItem } from "@/services/nonConsumableItemService";

interface SelectNonConsumableItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ApiNonConsumableItem[];
  onSelect: (item: ApiNonConsumableItem) => void;
}

export function SelectNonConsumableItemDialog({
  open,
  onOpenChange,
  items,
  onSelect,
}: SelectNonConsumableItemDialogProps) {
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (!open) setSelectedId("");
  }, [open]);

  const selected = items.find((i) => i.id === selectedId);

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
      setSelectedId("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Non-Consumable Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Item</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose an item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} ({i.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="warning" onClick={handleConfirm} disabled={!selected}>
            Add Ledger Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
