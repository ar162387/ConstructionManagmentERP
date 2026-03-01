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
import type { ApiConsumableItem } from "@/services/consumableItemsService";

interface SelectConsumableItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  items: ApiConsumableItem[];
  onSelectLedgerEntry: (item: ApiConsumableItem) => void;
  onSelectConsumption: () => void;
}

export function SelectConsumableItemDialog({
  open,
  onOpenChange,
  items,
  onSelectLedgerEntry,
  onSelectConsumption,
}: SelectConsumableItemDialogProps) {
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (!open) setSelectedId("");
  }, [open]);

  const selected = items.find((i) => i.id === selectedId);

  const handleLedgerEntry = () => {
    if (selected) {
      onSelectLedgerEntry(selected);
      setSelectedId("");
    }
  };

  const handleConsumption = () => {
    onSelectConsumption();
    setSelectedId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>Consumable — Ledger or Consumption</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 min-w-0">
          <div className="min-w-0">
            <Label>Item (for ledger entry)</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="mt-1 w-full min-w-0">
                <SelectValue placeholder="Choose an item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} ({i.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="shrink-0">
            Cancel
          </Button>
          <Button variant="outline" onClick={handleLedgerEntry} disabled={!selected} className="shrink-0">
            Add Ledger Entry
          </Button>
          <Button variant="warning" onClick={handleConsumption} className="shrink-0">
            Record Consumption
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
