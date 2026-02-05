import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { ContractorBillingEntry } from '@/types';
import type { Contractor } from '@/types';

interface ContractorBillingEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: ContractorBillingEntry | null;
  contractors: Contractor[];
  projectId: string | null;
  onSave: (data: {
    id?: string;
    projectId: string;
    contractorId: string;
    amount: number;
    remarks?: string;
    entryDate: string;
  }) => void;
}

export function ContractorBillingEntryDialog({
  open,
  onOpenChange,
  entry,
  contractors,
  projectId,
  onSave,
}: ContractorBillingEntryDialogProps) {
  const [contractorId, setContractorId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [remarks, setRemarks] = useState('');
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [popoverContainer, setPopoverContainer] = useState<HTMLElement | null>(null);
  const contentRef = useCallback((el: HTMLDivElement | null) => {
    setPopoverContainer(el);
  }, []);

  useEffect(() => {
    if (open) {
      if (entry) {
        setContractorId(entry.contractorId);
        setAmount(entry.amount);
        setRemarks(entry.remarks ?? '');
        setEntryDate(entry.entryDate);
      } else {
        setContractorId('');
        setAmount(0);
        setRemarks('');
        setEntryDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [open, entry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !contractorId || amount <= 0) return;
    onSave({
      id: entry?.id,
      projectId,
      contractorId,
      amount,
      remarks: remarks.trim() || undefined,
      entryDate,
    });
    onOpenChange(false);
  };

  const contractorOptions = contractors.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={contentRef} className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit Billing Entry' : 'Add Billing Entry'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add or edit a billing entry for the selected month.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Contractor</Label>
            <Combobox
              value={contractorId}
              onValueChange={setContractorId}
              options={contractorOptions}
              placeholder="Select contractor"
              searchPlaceholder="Search contractors..."
              required
              container={popoverContainer}
            />
          </div>
          <div className="space-y-2">
            <Label>Amount (PKR)</Label>
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Entry Date</Label>
            <Input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Remarks (optional)</Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{entry ? 'Save Changes' : 'Add Entry'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
