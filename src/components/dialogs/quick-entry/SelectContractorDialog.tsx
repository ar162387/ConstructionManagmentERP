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
import type { ApiContractorWithTotals } from "@/services/contractorsService";

interface SelectContractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  contractors: ApiContractorWithTotals[];
  onSelectEntry: (contractor: ApiContractorWithTotals) => void;
  onSelectPayment: (contractor: ApiContractorWithTotals) => void;
}

export function SelectContractorDialog({
  open,
  onOpenChange,
  contractors,
  onSelectEntry,
  onSelectPayment,
}: SelectContractorDialogProps) {
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (!open) setSelectedId("");
  }, [open]);

  const selected = contractors.find((c) => c.id === selectedId);

  const handleEntry = () => {
    if (selected) {
      onSelectEntry(selected);
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
          <DialogTitle>Select Contractor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Contractor</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a contractor" />
              </SelectTrigger>
              <SelectContent>
                {contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.remaining != null && c.remaining > 0 ? ` (${c.remaining.toLocaleString()} due)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={handleEntry} disabled={!selected}>
            Add Entry
          </Button>
          <Button variant="warning" onClick={handlePayment} disabled={!selected}>
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
