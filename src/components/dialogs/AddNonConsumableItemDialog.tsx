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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listNonConsumableCategories,
  createNonConsumableCategory,
} from "@/services/nonConsumableCategoryService";
import { createNonConsumableItem } from "@/services/nonConsumableItemService";
import { toast } from "sonner";

interface AddNonConsumableItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddNonConsumableItemDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddNonConsumableItemDialogProps) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Tools");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [unit, setUnit] = useState("piece");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCategoriesLoading(true);
      listNonConsumableCategories()
        .then((list) => {
          setCategories(list);
          if (list.length > 0 && !list.some((c) => c.name === category)) {
            setCategory(list[0].name);
          }
        })
        .catch(() => toast.error("Failed to load categories"))
        .finally(() => setCategoriesLoading(false));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Item name is required");
      return;
    }
    let effectiveCategory = category;
    if (category === "Other" && newCategoryName.trim()) {
      try {
        const created = await createNonConsumableCategory({ name: newCategoryName.trim() });
        effectiveCategory = created.name;
        setCategories((prev) => [...prev, { id: created.id, name: created.name }]);
        setCategory(created.name);
        setNewCategoryName("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create category");
        return;
      }
    } else if (category === "Other") {
      toast.error("Enter a name for the new category when selecting Other");
      return;
    }
    setLoading(true);
    try {
      await createNonConsumableItem({
        name: name.trim(),
        category: effectiveCategory,
        unit: unit.trim() || "piece",
      });
      toast.success("Asset added");
      onSuccess();
      onOpenChange(false);
      setName("");
      setCategory("Tools");
      setUnit("piece");
      setNewCategoryName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add asset");
    } finally {
      setLoading(false);
    }
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
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Concrete Mixer"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={setCategory}
              disabled={categoriesLoading}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {category === "Other" && (
            <div>
              <Label>New Category Name *</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Electrical Equipment"
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label>Unit Type</Label>
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="piece"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="warning" disabled={loading}>
              {loading ? "Adding…" : "Add Asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
