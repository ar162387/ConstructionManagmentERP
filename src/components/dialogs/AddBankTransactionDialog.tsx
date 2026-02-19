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

interface AddBankTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBankTransactionDialog({ open, onOpenChange }: AddBankTransactionDialogProps) {
  const { state, actions } = useMockStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<"Inflow" | "Outflow">("Inflow");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState<"Cash" | "Bank" | "Online">("Bank");
  const [referenceId, setReferenceId] = useState("");
  const [remarks, setRemarks] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!date || isNaN(amt) || amt <= 0 || !source.trim() || !destination.trim()) {
      toast.error("Date, amount, source and destination are required");
      return;
    }
    actions.addBankTransaction({
      date,
      type,
      amount: amt,
      source: source.trim(),
      destination: destination.trim(),
      mode,
      referenceId: referenceId || undefined,
      remarks: remarks || undefined,
    });
    actions.addAuditLog({
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      user: "admin@erp.com",
      role: "Admin",
      action: "Create",
      module: "Bank & Accounts",
      description: `${type}: ${amount} — ${source} → ${destination}`,
    });
    toast.success("Transaction recorded");
    onOpenChange(false);
    setAmount("");
    setSource("");
    setDestination("");
    setReferenceId("");
    setRemarks("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as "Inflow" | "Outflow")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inflow">Inflow</SelectItem>
                  <SelectItem value="Outflow">Outflow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Amount *</Label>
            <Input type="number" min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Source *</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Client Payment" className="mt-1" />
          </div>
          <div>
            <Label>Destination *</Label>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. SBI Account" className="mt-1" />
          </div>
          <div>
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as "Cash" | "Bank" | "Online")}>
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
            <Label>Reference / Cheque No</Label>
            <Input value={referenceId} onChange={(e) => setReferenceId(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning">Add Transaction</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
