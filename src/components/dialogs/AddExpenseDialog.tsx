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
import { useExpenseCategories } from "@/hooks/useExpenses";
import { createExpense } from "@/services/expensesService";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  /** Increment to refetch categories (e.g. after add/edit expense with new category) */
  categoriesRefreshKey?: number;
  onSuccess?: () => void;
}

export function AddExpenseDialog({ open, onOpenChange, projectId, categoriesRefreshKey, onSuccess }: AddExpenseDialogProps) {
  const categories = useExpenseCategories(projectId, categoriesRefreshKey);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Bank" | "Online">("Cash");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      setCategory(newCategory.trim());
      setShowNewCategory(false);
      setNewCategory("");
      toast.success("Category will be created on save");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    const cat = showNewCategory ? newCategory.trim() : category;
    if (!date || !description.trim() || !cat || isNaN(amt) || amt <= 0 || !projectId) {
      toast.error("Fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await createExpense({
        projectId,
        date,
        description: description.trim(),
        category: cat,
        paymentMode,
        amount: amt,
      });
      toast.success("Expense added");
      onOpenChange(false);
      setDescription("");
      setCategory("");
      setAmount("");
      setNewCategory("");
      setShowNewCategory(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Description *</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Site office electricity" className="mt-1" />
          </div>
          <div>
            <Label>Category *</Label>
            <div className="flex gap-2 mt-1">
              <Select value={showNewCategory ? "__new__" : category} onValueChange={(v) => { if (v === "__new__") setShowNewCategory(true); else { setShowNewCategory(false); setCategory(v); } }}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select or create category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value="__new__">+ Create new category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {showNewCategory && (
              <div className="flex gap-2 mt-2">
                <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name" />
                <Button type="button" variant="outline" size="sm" onClick={handleAddCategory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div>
            <Label>Payment Mode *</Label>
            <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as "Cash" | "Bank" | "Online")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Bank">Bank</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount *</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 10000"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={loading}>Add Expense</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
