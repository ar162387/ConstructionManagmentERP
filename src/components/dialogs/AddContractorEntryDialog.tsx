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
import { createContractorEntry } from "@/services/contractorLedgerService";
import type { ApiContractorWithTotals } from "@/services/contractorsService";
import { toast } from "sonner";

interface AddContractorEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultContractorId?: string;
  projectId: string;
  contractors: ApiContractorWithTotals[];
  onSuccess?: () => void;
}

export function AddContractorEntryDialog({
  open,
  onOpenChange,
  defaultContractorId,
  projectId,
  contractors,
  onSuccess,
}: AddContractorEntryDialogProps) {
  const [contractorId, setContractorId] = useState(defaultContractorId ?? contractors[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && defaultContractorId && contractors.some((c) => c.id === defaultContractorId)) {
      setContractorId(defaultContractorId);
    } else if (open && contractors[0]) {
      setContractorId(contractors[0].id);
    }
  }, [open, defaultContractorId, contractors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractorId) {
      toast.error("Select a contractor");
      return;
    }
    const amt = parseFloat(amount);
    if (!date || isNaN(amt) || amt <= 0) {
      toast.error("Valid date and amount are required");
      return;
    }
    setSubmitting(true);
    try {
      await createContractorEntry({
        contractorId,
        projectId,
        date,
        amount: amt,
        remarks: remarks.trim(),
      });
      toast.success("Entry added");
      onOpenChange(false);
      setAmount("");
      setRemarks("");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add entry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Contractor Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Contractor *</Label>
            <Select value={contractorId} onValueChange={setContractorId} disabled={contractors.length === 0}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={contractors.length === 0 ? "No contractors" : "Select contractor"} />
              </SelectTrigger>
              <SelectContent>
                {contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Amount *</Label>
            <Input type="number" min={0.01} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={submitting || contractors.length === 0}>Add Entry</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
