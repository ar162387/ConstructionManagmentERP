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
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { createStockConsumption, updateStockConsumption, type ApiStockConsumption } from "@/services/stockConsumptionService";
import type { ApiConsumableItem } from "@/services/consumableItemsService";

interface ConsumptionRow {
  itemId: string;
  quantityUsed: string;
}

interface StockConsumptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Currently selected project on the page — project selection is NOT done inside this dialog. */
  projectId: string | null;
  consumableItems: ApiConsumableItem[];
  /** Provide to edit an existing entry, null/undefined to create new. */
  editEntry?: ApiStockConsumption | null;
  onSuccess: () => void;
}

export function StockConsumptionDialog({
  open,
  onOpenChange,
  projectId,
  consumableItems,
  editEntry,
  onSuccess,
}: StockConsumptionDialogProps) {
  const isEdit = !!editEntry;
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [rows, setRows] = useState<ConsumptionRow[]>([{ itemId: "", quantityUsed: "" }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (editEntry) {
        setDate(editEntry.date);
        setRemarks(editEntry.remarks ?? "");
        setRows(editEntry.items.map((i) => ({ itemId: i.itemId, quantityUsed: String(i.quantityUsed) })));
      } else {
        setDate(new Date().toISOString().slice(0, 10));
        setRemarks("");
        setRows([{ itemId: "", quantityUsed: "" }]);
      }
    }
  }, [open, editEntry]);

  const addRow = () => setRows((r) => [...r, { itemId: "", quantityUsed: "" }]);
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  const updateRow = (i: number, field: keyof ConsumptionRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) { toast.error("No project selected"); return; }
    if (!date) { toast.error("Date is required"); return; }

    const items: { itemId: string; quantityUsed: number }[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row.itemId) continue;
      const qty = parseInt(row.quantityUsed, 10);
      if (isNaN(qty) || qty < 1) { toast.error("All quantities must be positive integers"); return; }

      if (seen.has(row.itemId)) {
        const dupName = consumableItems.find((c) => c.id === row.itemId)?.name ?? "This item";
        toast.error(`${dupName} already added. Update the existing row instead of adding a duplicate.`);
        return;
      }
      seen.add(row.itemId);

      const item = consumableItems.find((c) => c.id === row.itemId);
      if (item) {
        const existingQty = editEntry?.items.find((ei) => ei.itemId === row.itemId)?.quantityUsed ?? 0;
        const availableAfterReverse = item.currentStock + (isEdit ? existingQty : 0);
        if (qty > availableAfterReverse) {
          toast.error(`Insufficient stock for "${item.name}": available ${availableAfterReverse} ${item.unit}, requested ${qty}`);
          return;
        }
      }
      items.push({ itemId: row.itemId, quantityUsed: qty });
    }

    if (items.length === 0) { toast.error("Add at least one item with quantity"); return; }

    setLoading(true);
    try {
      if (isEdit && editEntry) {
        await updateStockConsumption(editEntry.id, { date, remarks: remarks || undefined, items });
        toast.success("Consumption entry updated");
      } else {
        await createStockConsumption({ projectId, date, remarks: remarks || undefined, items });
        toast.success("Stock consumption recorded");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save consumption");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Consumption Entry" : "Stock Consumption"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="mt-1" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Items *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="h-3 w-3 mr-1" /> Add row
              </Button>
            </div>
            <div className="space-y-2 border border-border p-3 rounded-md">
              {rows.map((row, i) => {
                const selectedItem = consumableItems.find((c) => c.id === row.itemId);
                const existingQty = editEntry?.items.find((ei) => ei.itemId === row.itemId)?.quantityUsed ?? 0;
                const available = selectedItem
                  ? selectedItem.currentStock + (isEdit ? existingQty : 0)
                  : 0;
                return (
                  <div key={i} className="flex flex-wrap items-end gap-2">
                    <Select
                      value={row.itemId}
                      onValueChange={(v) => {
                        const duplicate = rows.some((r, idx) => idx !== i && r.itemId === v);
                        if (duplicate) {
                          const dupName = consumableItems.find((c) => c.id === v)?.name ?? "This item";
                          toast.error(`${dupName} already added. Update the existing row instead of adding a duplicate.`);
                          return;
                        }
                        updateRow(i, "itemId", v);
                      }}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Item" />
                      </SelectTrigger>
                      <SelectContent>
                        {consumableItems.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      max={selectedItem ? available : undefined}
                      placeholder="Qty"
                      className="w-20"
                      value={row.quantityUsed}
                      onChange={(e) => updateRow(i, "quantityUsed", e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground min-w-[60px]">
                      {selectedItem ? `${selectedItem.unit} (avail: ${available})` : "—"}
                    </span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={loading}>
              {loading ? "Saving…" : isEdit ? "Save Changes" : "Record Consumption"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
