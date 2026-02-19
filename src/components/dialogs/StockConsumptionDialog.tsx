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
import { Plus, Trash2 } from "lucide-react";

interface ConsumptionRow {
  itemId: string;
  itemName: string;
  unit: string;
  quantityUsed: string;
}

interface StockConsumptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockConsumptionDialog({ open, onOpenChange }: StockConsumptionDialogProps) {
  const { state, actions } = useMockStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [projectId, setProjectId] = useState(state.projects[0]?.id || "");
  const [remarks, setRemarks] = useState("");
  const [rows, setRows] = useState<ConsumptionRow[]>([
    { itemId: "", itemName: "", unit: "", quantityUsed: "" },
  ]);

  const consumableItems = state.consumableItems;
  const projects = state.projects;

  const addRow = () => setRows((r) => [...r, { itemId: "", itemName: "", unit: "", quantityUsed: "" }]);
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof ConsumptionRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      if (field === "itemId") {
        const item = consumableItems.find((c) => c.id === value);
        if (item) {
          next[i].itemName = item.name;
          next[i].unit = item.unit;
        }
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !projectId) {
      toast.error("Date and project are required");
      return;
    }
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      toast.error("Invalid project");
      return;
    }
    const items = rows
      .map((r) => {
        const qty = parseInt(r.quantityUsed, 10);
        if (!r.itemId || isNaN(qty) || qty <= 0) return null;
        const item = consumableItems.find((c) => c.id === r.itemId);
        if (!item) return null;
        return { itemId: item.id, itemName: item.name, unit: item.unit, quantityUsed: qty };
      })
      .filter(Boolean) as { itemId: string; itemName: string; unit: string; quantityUsed: number }[];
    if (items.length === 0) {
      toast.error("Add at least one item with quantity");
      return;
    }
    actions.addStockConsumption({
      date,
      projectId,
      projectName: project.name,
      remarks: remarks || undefined,
      items,
    });
    actions.addAuditLog({
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      user: "admin@erp.com",
      role: "Admin",
      action: "Create",
      module: "Stock Consumption",
      description: `Stock consumption: ${items.length} item(s) for ${project.name}`,
    });
    toast.success("Stock consumption recorded");
    onOpenChange(false);
    setRows([{ itemId: "", itemName: "", unit: "", quantityUsed: "" }]);
    setRemarks("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stock Consumption</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Project *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
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
              {rows.map((row, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2">
                  <Select value={row.itemId} onValueChange={(v) => updateRow(i, "itemId", v)}>
                    <SelectTrigger className="w-[140px]">
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
                    placeholder="Qty"
                    className="w-20"
                    value={row.quantityUsed}
                    onChange={(e) => updateRow(i, "quantityUsed", e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">{row.unit || "—"}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning">Record Consumption</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
