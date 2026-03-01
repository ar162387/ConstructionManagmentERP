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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

          {selected && (
            <section className="rounded-lg border border-border bg-muted/30 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Overview — where this asset sits
              </h3>
              <p className="text-sm text-foreground mb-2">
                <span className="font-medium">{selected.companyStore}</span> {selected.unit}(s) in company store ·{" "}
                <span className="font-medium">{selected.inUse}</span> in use ({(selected.inUseByProject?.length ?? 0) || 0} project(s)) ·{" "}
                <span className="font-medium">{selected.underRepair}</span> under repair ·{" "}
                <span className="font-medium">{selected.lost}</span> lost ·{" "}
                <span className="font-medium">{selected.totalQuantity}</span> total
              </p>
              {selected.totalQuantity > 0 && (
                <div className="flex h-5 w-full overflow-hidden rounded-md border border-border bg-background mb-2">
                  {selected.companyStore > 0 && (
                    <div
                      className="bg-success/80 shrink-0"
                      style={{ width: `${(100 * selected.companyStore) / selected.totalQuantity}%` }}
                      title={`Company store: ${selected.companyStore}`}
                    />
                  )}
                  {selected.inUse > 0 && (
                    <div
                      className="bg-primary/80 shrink-0"
                      style={{ width: `${(100 * selected.inUse) / selected.totalQuantity}%` }}
                      title={`In use: ${selected.inUse}`}
                    />
                  )}
                  {selected.underRepair > 0 && (
                    <div
                      className="bg-warning/80 shrink-0"
                      style={{ width: `${(100 * selected.underRepair) / selected.totalQuantity}%` }}
                      title={`Under repair: ${selected.underRepair}`}
                    />
                  )}
                  {selected.lost > 0 && (
                    <div
                      className="bg-destructive/80 shrink-0"
                      style={{ width: `${(100 * selected.lost) / selected.totalQuantity}%` }}
                      title={`Lost: ${selected.lost}`}
                    />
                  )}
                </div>
              )}
              {(selected.inUseByProject?.length ?? 0) > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">In use by project</p>
                  <ul className="text-xs space-y-0.5 max-h-24 overflow-y-auto">
                    {(selected.inUseByProject ?? []).map((e) => (
                      <li key={e.projectId} className="flex justify-between gap-2">
                        <span className="truncate">{e.projectName}</span>
                        <span className="font-mono shrink-0">{e.quantity} {selected.unit}(s)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
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
