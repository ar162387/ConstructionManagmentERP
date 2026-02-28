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
import { updateMachine, type ApiMachineWithTotals, type UpdateMachineInput } from "@/services/machinesService";
import { toast } from "sonner";

interface EditMachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machine: ApiMachineWithTotals | null;
  onSave?: () => void;
}

export function EditMachineDialog({
  open,
  onOpenChange,
  machine,
  onSave,
}: EditMachineDialogProps) {
  const [name, setName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (machine) {
      setName(machine.name);
      setHourlyRate(String(machine.hourlyRate));
    }
  }, [machine, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machine) return;
    if (!name.trim()) {
      toast.error("Machine name is required");
      return;
    }
    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate < 0) {
      toast.error("Valid hourly rate is required");
      return;
    }
    setSubmitting(true);
    try {
      const input: UpdateMachineInput = { name: name.trim(), hourlyRate: rate };
      await updateMachine(machine.id, input);
      toast.success("Machine updated");
      onOpenChange(false);
      onSave?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update machine");
    } finally {
      setSubmitting(false);
    }
  };

  if (!machine) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Machine</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Only name and hourly rate can be edited. Changing the rate does not affect past ledger entries.</p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tower Crane TC-200" className="mt-1" />
          </div>
          <div>
            <Label>Hourly Rate *</Label>
            <Input type="number" min={0} step={0.01} value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={submitting}>{submitting ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
