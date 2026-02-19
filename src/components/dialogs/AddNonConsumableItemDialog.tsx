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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMockStore } from "@/context/MockStore";
import { toast } from "sonner";

const CATEGORIES = ["Tools", "Scaffolding", "Shuttering", "Safety Gear", "Machinery", "Other"];

interface AddNonConsumableItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddNonConsumableItemDialog({ open, onOpenChange }: AddNonConsumableItemDialogProps) {
  const { actions } = useMockStore();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Tools");
  const [unit, setUnit] = useState("piece");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Item name is required");
      return;
    }
    actions.addNonConsumableItem({
      name: name.trim(),
      category,
      totalQuantity: 0,
      companyStore: 0,
      inUse: 0,
      underRepair: 0,
      lost: 0,
    });
    actions.addAuditLog({
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      user: "admin@erp.com",
      role: "Admin",
      action: "Create",
      module: "Non-Consumable Inventory",
      description: `Added asset: ${name.trim()}`,
    });
    toast.success("Asset added");
    onOpenChange(false);
    setName("");
    setCategory("Tools");
    setUnit("piece");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Non-Consumable Asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Item Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Concrete Mixer" className="mt-1" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unit Type</Label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="piece" className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning">Add Asset</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
