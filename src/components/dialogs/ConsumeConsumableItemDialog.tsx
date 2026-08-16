import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createStockConsumption } from "@/services/stockConsumptionService";
import { createConsumableUnit, listConsumableUnits, type ApiConsumableUnit } from "@/services/consumableUnitService";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { todayPKT } from "@/lib/pktDate";
import { formatQuantity } from "@/lib/mock-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: { id: string; projectId: string; name: string; currentStock: number };
  onSuccess: () => void;
}

export function ConsumeConsumableItemDialog({ open, onOpenChange, item, onSuccess }: Props) {
  const [date, setDate] = useState(todayPKT());
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [units, setUnits] = useState<ApiConsumableUnit[]>([]);
  const [addingUnit, setAddingUnit] = useState(false);
  const [newUnit, setNewUnit] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(todayPKT()); setQuantity(""); setUnit(""); setRemarks("");
    listConsumableUnits().then(setUnits).catch(() => toast.error("Failed to load units"));
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const quantityUsed = Math.round(Number(quantity) * 100) / 100;
    if (!date || !Number.isFinite(quantityUsed) || quantityUsed <= 0) return toast.error("Date and a valid quantity are required");
    if (!unit.trim()) return toast.error("Unit is required");
    if (quantityUsed > item.currentStock) return toast.error(`Only ${item.currentStock} are available`);
    setLoading(true);
    try {
      await createStockConsumption({ projectId: item.projectId, date, remarks: remarks.trim() || undefined, items: [{ itemId: item.id, unit: unit.trim(), quantityUsed }] });
      toast.success("Consumption recorded");
      onSuccess();
      onOpenChange(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to record consumption"); }
    finally { setLoading(false); }
  };

  const handleCreateUnit = async () => {
    const name = newUnit.trim();
    if (!name) return toast.error("Enter a unit name");
    try {
      const created = await createConsumableUnit({ name });
      setUnits((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setUnit(created.name); setNewUnit(""); setAddingUnit(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to create unit"); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Consume — {item.name}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted-foreground">Available: <strong>{formatQuantity(item.currentStock)}</strong></p>
        <div><Label>Date *</Label><Input className="mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><Label>Use Qty *</Label><Input className="mt-1" type="number" step="0.01" min={0.01} max={item.currentStock} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
        <div><Label>Unit *</Label><div className="mt-1 flex gap-2"><Select value={unit} onValueChange={setUnit}><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger><SelectContent>{units.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => setAddingUnit((value) => !value)} aria-label="Add unit"><Plus className="h-4 w-4" /></Button></div></div>
        {addingUnit && <div className="rounded-md border border-border p-3"><Label>New Unit *</Label><div className="mt-1 flex gap-2"><Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="e.g. bag, kg, cft" /><Button type="button" variant="outline" onClick={handleCreateUnit}>Add</Button></div></div>}
        <div><Label>Remarks</Label><Textarea className="mt-1" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} /></div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" variant="warning" disabled={loading}>{loading ? "Saving…" : "Consume"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
