import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BankAccount } from '@/types';

interface BankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: BankAccount | null;
  onSave: (data: Partial<BankAccount>) => void;
}

export function BankAccountDialog({ open, onOpenChange, account, onSave }: BankAccountDialogProps) {
  const [formData, setFormData] = useState({
    name: account?.name || '',
    bankName: account?.bankName || '',
    accountNumber: account?.accountNumber || '',
    balance: account?.balance || 0,
    type: account?.type || 'business' as const,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{account ? 'Edit Account' : 'Add New Account'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Operations Account"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              placeholder="e.g., First National Bank"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder="e.g., ****4521"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="balance">Initial Balance</Label>
            <Input
              id="balance"
              type="number"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Account Type</Label>
            <Select value={formData.type} onValueChange={(value: 'checking' | 'savings' | 'business') => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{account ? 'Save Changes' : 'Add Account'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
