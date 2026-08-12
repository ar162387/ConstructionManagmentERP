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
import { Plus } from "lucide-react";
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
  const [category, setCategory] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [unit, setUnit] = useState("piece");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCategoriesLoading(true);
      listNonConsumableCategories()
        .then((list) => {
          setCategories(list);
          setCategory((current) =>
            list.some((c) => c.name === current) ? current : (list[0]?.name ?? "")
          );
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
    if (!category) {
      toast.error("Select or add a category");
      return;
    }
    setLoading(true);
    try {
      await createNonConsumableItem({
        name: name.trim(),
        category,
        unit: unit.trim() || "piece",
      });
      toast.success("Asset added");
      onSuccess();
      setName("");
      setCategory(categories[0]?.name ?? "");
      setUnit("piece");
      setNewCategoryName("");
      setAddingCategory(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add asset");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error("Enter a category name");
      return;
    }
    setCreatingCategory(true);
    try {
      const created = await createNonConsumableCategory({ name });
      setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setCategory(created.name);
      setNewCategoryName("");
      setAddingCategory(false);
      toast.success("Category added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setCreatingCategory(false);
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
            <div className="mt-1 flex gap-2">
              <Select value={category} onValueChange={setCategory} disabled={categoriesLoading || categories.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={categoriesLoading ? "Loading categories…" : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" onClick={() => setAddingCategory((open) => !open)} aria-label="Add category">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {addingCategory && (
            <div className="rounded-md border border-border p-3">
              <Label>New Category Name *</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Electrical Equipment"
                />
                <Button type="button" variant="outline" onClick={handleCreateCategory} disabled={creatingCategory}>
                  {creatingCategory ? "Adding…" : "Add"}
                </Button>
              </div>
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
