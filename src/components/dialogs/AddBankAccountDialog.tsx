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
import { useMockStore } from "@/context/MockStore";
import { toast } from "sonner";

interface AddBankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBankAccountDialog({ open, onOpenChange }: AddBankAccountDialogProps) {
  const { actions } = useMockStore();
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim()) {
      toast.error("Bank name is required");
      return;
    }
    const ob = parseFloat(openingBalance);
    if (isNaN(ob)) {
      toast.error("Enter valid opening balance");
      return;
    }
    actions.addBankAccount({
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim() || "—",
      openingBalance: ob,
      currentBalance: ob,
      totalInflow: 0,
      totalOutflow: 0,
    });
    actions.addAuditLog({
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      user: "admin@erp.com",
      role: "Admin",
      action: "Create",
      module: "Bank & Accounts",
      description: `Added account: ${bankName.trim()}`,
    });
    toast.success("Account added");
    onOpenChange(false);
    setBankName("");
    setAccountNumber("");
    setOpeningBalance("0");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Bank Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Bank Name *</Label>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. State Bank" className="mt-1" />
          </div>
          <div>
            <Label>Account Number</Label>
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="XXXX-XXXX-1234" className="mt-1" />
          </div>
          <div>
            <Label>Opening Balance</Label>
            <Input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning">Add Account</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
