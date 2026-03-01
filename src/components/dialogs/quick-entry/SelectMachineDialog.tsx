import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ApiMachineWithTotals } from "@/services/machinesService";

interface SelectMachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  machines: ApiMachineWithTotals[];
  onSelectLedgerEntry: (machine: ApiMachineWithTotals) => void;
  onSelectPayment: (machine: ApiMachineWithTotals) => void;
}

export function SelectMachineDialog({
  open,
  onOpenChange,
  machines,
  onSelectLedgerEntry,
  onSelectPayment,
}: SelectMachineDialogProps) {
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (!open) setSelectedId("");
  }, [open]);

  const selected = machines.find((m) => m.id === selectedId);

  const handleLedgerEntry = () => {
    if (selected) {
      onSelectLedgerEntry(selected);
      setSelectedId("");
    }
  };

  const handlePayment = () => {
    if (selected) {
      onSelectPayment(selected);
      setSelectedId("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Machine</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Machine</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a machine" />
              </SelectTrigger>
              <SelectContent>
                {machines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                    {m.totalPending != null && m.totalPending > 0 ? ` (${m.totalPending.toLocaleString()} due)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={handleLedgerEntry} disabled={!selected}>
            Add Ledger Entry
          </Button>
          <Button variant="warning" onClick={handlePayment} disabled={!selected}>
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
