import { useEffect, useState } from "react";
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
import { updateExpense } from "@/services/expensesService";
import type { ApiExpense } from "@/services/expensesService";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ApiExpense | null;
  projectId: string | null;
  categoriesRefreshKey?: number;
  onSave?: () => void;
}

export function EditExpenseDialog({
  open,
  onOpenChange,
  expense,
  projectId,
  categoriesRefreshKey,
  onSave,
}: EditExpenseDialogProps) {
  const categoriesProjectId = expense?.projectId ?? projectId;
  const categories = useExpenseCategories(categoriesProjectId, categoriesRefreshKey);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Bank" | "Online">("Cash");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expense) return;
    setDate(expense.date);
    setDescription(expense.description);
    setCategory(expense.category);
    setShowNewCategory(false);
    setNewCategory("");
    setPaymentMode(expense.paymentMode);
    setAmount(String(expense.amount));
  }, [expense, open]);

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      setCategory(newCategory.trim());
      setShowNewCategory(false);
      setNewCategory("");
      toast.success("Category will be saved on submit");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense) return;
    const amt = parseFloat(amount);
    const cat = showNewCategory ? newCategory.trim() : category;
    if (!date || !description.trim() || !cat || isNaN(amt) || amt <= 0) {
      toast.error("Fill all required fields");
      return;
    }

    setLoading(true);
    try {
      await updateExpense(expense.id, {
        date,
        description: description.trim(),
        category: cat,
        paymentMode,
        amount: amt,
      });
      toast.success("Expense updated");
      onOpenChange(false);
      onSave?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update expense");
    } finally {
      setLoading(false);
    }
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="warning" disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
