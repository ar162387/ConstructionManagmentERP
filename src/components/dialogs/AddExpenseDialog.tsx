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
import { Plus } from "lucide-react";

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set (e.g. Site Manager), project is fixed to this and selector is hidden */
  restrictedProjectId?: string;
  restrictedProjectName?: string;
}

export function AddExpenseDialog({ open, onOpenChange, restrictedProjectId, restrictedProjectName }: AddExpenseDialogProps) {
  const { state, actions } = useMockStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Bank" | "Online">("Cash");
  const [amount, setAmount] = useState("");
  const [projectId, setProjectId] = useState(state.projects[0]?.id || "");

  const categories = state.expenseCategories;
  const projects = state.projects;
  const effectiveProjectId = restrictedProjectId ?? projectId;
  const effectiveProject = projects.find((p) => p.id === effectiveProjectId);
  const projectName = effectiveProject?.name ?? restrictedProjectName ?? projects.find((p) => p.id === projectId)?.name;

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      actions.addExpenseCategory(newCategory.trim());
      setCategory(newCategory.trim());
      setShowNewCategory(false);
      setNewCategory("");
      toast.success("Category added");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    const cat = showNewCategory ? newCategory.trim() : category;
    if (!date || !description.trim() || !cat || isNaN(amt) || amt <= 0 || !projectName) {
      toast.error("Fill all required fields");
      return;
    }
    if (showNewCategory && newCategory.trim()) {
      actions.addExpenseCategory(newCategory.trim());
    }
    actions.addExpense({
      date,
      description: description.trim(),
      category: showNewCategory ? newCategory.trim() : category,
      paymentMode,
      amount: amt,
      project: projectName,
    });
    actions.addAuditLog({
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      user: "admin@erp.com",
      role: "Admin",
      action: "Create",
      module: "Expense",
      description: `Expense: ${description.trim()} — ${amt}`,
    });
    toast.success("Expense added");
    onOpenChange(false);
    setDescription("");
    setCategory("");
    setAmount("");
    setNewCategory("");
    setShowNewCategory(false);
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
            <Label>Project *</Label>
            {restrictedProjectId && restrictedProjectName ? (
              <p className="mt-1.5 text-sm font-medium">{restrictedProjectName}</p>
            ) : (
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
            <Input type="number" min={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning">Add Expense</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
