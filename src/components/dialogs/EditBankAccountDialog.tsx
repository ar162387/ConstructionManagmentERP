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
import { updateBankAccount } from "@/services/bankAccountService";
import type { ApiBankAccount } from "@/services/bankAccountService";
import { toast } from "sonner";

interface EditBankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: ApiBankAccount | null;
  onSuccess?: () => void;
}

export function EditBankAccountDialog({ open, onOpenChange, account, onSuccess }: EditBankAccountDialogProps) {
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account) {
      setAccountName(account.name);
      setAccountNumber(account.accountNumber);
      setOpeningBalance(String(account.openingBalance));
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    if (!accountName.trim()) {
      toast.error("Account name is required");
      return;
    }
    const ob = parseFloat(openingBalance);
    if (isNaN(ob) || ob < 0) {
      toast.error("Enter valid opening balance");
      return;
    }
    setLoading(true);
    try {
      await updateBankAccount(account.id, {
        name: accountName.trim(),
        accountNumber: accountNumber.trim() || undefined,
        openingBalance: ob,
      });
      toast.success("Account updated");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Bank Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Account Name *</Label>
            <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. State Bank" className="mt-1" />
          </div>
          <div>
            <Label>Account Number</Label>
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="XXXX-XXXX-1234" className="mt-1" />
          </div>
          <div>
            <Label>Opening Balance</Label>
            <Input type="number" min={0} step="0.01" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
