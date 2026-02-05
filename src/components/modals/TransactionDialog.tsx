import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useProject } from '@/contexts/ProjectContext';
import { mockBankAccounts } from '@/data/mockData';
import { Transaction } from '@/types';

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'inflow' | 'outflow';
  onSave: (data: Partial<Transaction>) => void;
}

export function TransactionDialog({ open, onOpenChange, type, onSave }: TransactionDialogProps) {
  const { availableProjects } = useProject();
  const [formData, setFormData] = useState<{
    accountId: string;
    amount: number;
    description: string;
    category: string;
    paymentMode: 'cash' | 'bank_transfer' | 'cheque';
    projectId: string;
  }>({
    accountId: '',
    amount: 0,
    description: '',
    category: '',
    paymentMode: 'bank_transfer',
    projectId: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, type, date: new Date() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record {type === 'inflow' ? 'Inflow' : 'Outflow'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account">Bank Account</Label>
            <Select value={formData.accountId} onValueChange={(value) => setFormData({ ...formData, accountId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {mockBankAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="Materials">Materials</SelectItem>
                <SelectItem value="Payroll">Payroll</SelectItem>
                <SelectItem value="Revenue">Revenue</SelectItem>
                <SelectItem value="Utilities">Utilities</SelectItem>
                <SelectItem value="Rent">Rent</SelectItem>
                <SelectItem value="Equipment">Equipment</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project">Project (Optional)</Label>
            <Select value={formData.projectId} onValueChange={(value) => setFormData({ ...formData, projectId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="">Company Level</SelectItem>
                {availableProjects.map((proj) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentMode">Payment Mode</Label>
            <Select value={formData.paymentMode} onValueChange={(value: 'cash' | 'bank_transfer' | 'cheque') => setFormData({ ...formData, paymentMode: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Transaction details..."
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Record Transaction</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
