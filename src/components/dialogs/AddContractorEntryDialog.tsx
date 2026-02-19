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
import { useMockStore } from "@/context/MockStore";
import { toast } from "sonner";

interface AddContractorEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultContractorId?: string;
  /** When set, only contractors for this project are shown (e.g. Site Manager or Admin filtered by project) */
  projectFilterName?: string;
}

export function AddContractorEntryDialog({ open, onOpenChange, defaultContractorId, projectFilterName }: AddContractorEntryDialogProps) {
  const { state, actions } = useMockStore();
  const allContractors = state.contractors;
  const contractors = projectFilterName
    ? allContractors.filter((c) => c.project === projectFilterName)
    : allContractors;
  const [contractorId, setContractorId] = useState(defaultContractorId ?? contractors[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (open && defaultContractorId && contractors.some((c) => c.id === defaultContractorId)) setContractorId(defaultContractorId);
    else if (open && contractors[0]) setContractorId(contractors[0].id);
  }, [open, defaultContractorId, contractors]);

  const handleSubmit = (e: React.FormEvent) => {
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
    actions.addContractorEntry({
      contractorId,
      date,
      amount: amt,
      remarks: remarks.trim(),
    });
    actions.addAuditLog({
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      user: "admin@erp.com",
      role: "Admin",
      action: "Create",
      module: "Contractor",
      description: `Entry: ${contractors.find((c) => c.id === contractorId)?.name} — ${amt.toLocaleString()}`,
    });
    toast.success("Entry added");
    onOpenChange(false);
    setAmount("");
    setRemarks("");
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
            <Select value={contractorId} onValueChange={setContractorId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select contractor" />
              </SelectTrigger>
              <SelectContent>
                {contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} — {c.project}</SelectItem>
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
            <Input type="number" min={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning">Add Entry</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
