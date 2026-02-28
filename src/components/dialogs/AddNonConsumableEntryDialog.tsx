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
import {
  createNonConsumableLedgerEntry,
  updateNonConsumableLedgerEntry,
  type NonConsumableEventType,
  type ApiNonConsumableLedgerEntry,
} from "@/services/nonConsumableLedgerService";
import { toast } from "sonner";

const EVENT_TYPE_OPTIONS: { value: NonConsumableEventType; label: string }[] = [
  { value: "Purchase", label: "Purchase (Add to Company Store)" },
  { value: "AssignToProject", label: "Assign to Project" },
  { value: "ReturnToCompany", label: "Return to Company" },
  { value: "Repair", label: "Repair / Maintenance" },
  { value: "ReturnFromRepair", label: "Return from Repair" },
  { value: "MarkLost", label: "Mark Lost" },
];

interface AddNonConsumableEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
  /** Projects for dropdown (Assign projectTo, Return/Repair/Lost projectFrom). */
  projects: { id: string; name: string }[];
  /** Per-project in-use for validation (Return/Repair/Lost). */
  inUseByProject: Record<string, number>;
  /** Current item balances for validation */
  companyStore: number;
  inUse: number;
  underRepair: number;
  /** Pass existing entry to enable edit mode. */
  editEntry?: ApiNonConsumableLedgerEntry | null;
  onSuccess: () => void;
}

export function AddNonConsumableEntryDialog({
  open,
  onOpenChange,
  itemId,
  itemName,
  projects,
  inUseByProject,
  companyStore,
  inUse,
  underRepair,
  editEntry,
  onSuccess,
}: AddNonConsumableEntryDialogProps) {
  const isEdit = !!editEntry;
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventType, setEventType] = useState<NonConsumableEventType>("Purchase");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (editEntry) {
        setDate(editEntry.date);
        setEventType(editEntry.eventType);
        setQuantity(String(editEntry.quantity));
        setTotalCost(editEntry.totalCost != null ? String(editEntry.totalCost) : "");
        setRemarks(editEntry.remarks ?? "");
        setSelectedProjectId(editEntry.projectTo ?? editEntry.projectFrom ?? "");
      } else {
        setDate(new Date().toISOString().slice(0, 10));
        setEventType("Purchase");
        setSelectedProjectId("");
        setQuantity("");
        setTotalCost("");
        setRemarks("");
      }
    }
  }, [open, editEntry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!date || isNaN(qty) || qty <= 0) {
      toast.error("Date and quantity are required (quantity > 0)");
      return;
    }

    const needsCost = eventType === "Purchase" || eventType === "Repair";
    const cost = needsCost ? parseFloat(totalCost) : undefined;
    if (needsCost && (cost == null || isNaN(cost) || cost < 0)) {
      toast.error("Total cost is required for this event type (must be >= 0)");
      return;
    }

    if (eventType === "AssignToProject") {
      if (!selectedProjectId) {
        toast.error("Select a project");
        return;
      }
      if (qty > companyStore) {
        toast.error(`Quantity exceeds Company Store (${companyStore} available)`);
        return;
      }
    }

    if (eventType === "ReturnToCompany" || eventType === "Repair" || eventType === "MarkLost") {
      if (!selectedProjectId) {
        toast.error("Select a project");
        return;
      }
      const projectInUse = inUseByProject[selectedProjectId] ?? 0;
      if (qty > projectInUse) {
        toast.error(`Quantity exceeds In Use for this project (${projectInUse} available)`);
        return;
      }
    }

    if (eventType === "ReturnFromRepair") {
      if (qty > underRepair) {
        toast.error(`Quantity exceeds Under Repair (${underRepair} available)`);
        return;
      }
    }

    setLoading(true);
    try {
      const input = {
        date,
        eventType,
        quantity: qty,
        totalCost: needsCost ? (cost ?? 0) : undefined,
        projectTo: eventType === "AssignToProject" ? selectedProjectId : undefined,
        projectFrom:
          eventType === "ReturnToCompany" ||
          eventType === "Repair" ||
          eventType === "MarkLost"
            ? selectedProjectId
            : undefined,
        remarks: remarks.trim() || undefined,
      };

      if (isEdit && editEntry) {
        await updateNonConsumableLedgerEntry(itemId, editEntry.id, input);
        toast.success("Entry updated");
      } else {
        await createNonConsumableLedgerEntry(itemId, input);
        toast.success("Entry added");
      }
      onSuccess();
      onOpenChange(false);
      setQuantity("");
      setTotalCost("");
      setRemarks("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  const needsCost = eventType === "Purchase" || eventType === "Repair";
  const needsProject =
    eventType === "AssignToProject" ||
    eventType === "ReturnToCompany" ||
    eventType === "Repair" ||
    eventType === "MarkLost";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : "Add"} Ledger Entry — {itemName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Event Type *</Label>
            <Select
              value={eventType}
              onValueChange={(v) => setEventType(v as NonConsumableEventType)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsProject && (
            <div>
              <Label>Project *</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Quantity *</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1"
            />
          </div>
          {needsCost && (
            <div>
              <Label>Total Cost *</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label>Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="warning" disabled={loading || (needsProject && !selectedProjectId)}>
              {loading ? "Saving…" : isEdit ? "Update Entry" : "Add Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
