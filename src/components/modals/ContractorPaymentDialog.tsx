import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { PaymentMode } from '@/types';
import type { Contractor } from '@/types';

interface ContractorPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractors: Contractor[];
  /** Pre-selected contractor ID when filtering by contractor; empty = show contractor combobox */
  preselectedContractorId: string | null;
  /** Default payment date (e.g. end of selected month) */
  defaultPaymentDate: string;
  onSave: (data: {
    contractorId: string;
    amount: number;
    paymentDate: string;
    paymentMode?: PaymentMode;
    reference?: string;
  }) => void;
}

export function ContractorPaymentDialog({
  open,
  onOpenChange,
  contractors,
  preselectedContractorId,
  defaultPaymentDate,
  onSave,
}: ContractorPaymentDialogProps) {
  const [contractorId, setContractorId] = useState(preselectedContractorId ?? '');
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(defaultPaymentDate);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank_transfer');
  const [reference, setReference] = useState('');
  const [popoverContainer, setPopoverContainer] = useState<HTMLElement | null>(null);
  const contentRef = useCallback((el: HTMLDivElement | null) => {
    setPopoverContainer(el);
  }, []);

  useEffect(() => {
    if (open) {
      setContractorId(preselectedContractorId ?? '');
      setPaymentDate(defaultPaymentDate);
      setAmount(0);
      setPaymentMode('bank_transfer');
      setReference('');
    }
  }, [open, preselectedContractorId, defaultPaymentDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cid = contractorId || preselectedContractorId;
    if (!cid || amount <= 0) return;
    onSave({
      contractorId: cid,
      amount,
      paymentDate,
      paymentMode,
      reference: reference.trim() || undefined,
    });
    onOpenChange(false);
  };

  const contractorOptions = contractors.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const effectiveContractorId = (contractorId || preselectedContractorId) ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={contentRef} className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Contractor Payment</DialogTitle>
          <DialogDescription>
            Record a consolidated payment for the contractor for the selected month.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!preselectedContractorId && (
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
          )}
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
            <Label>Payment Date</Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Payment Mode</Label>
            <Select value={paymentMode} onValueChange={(v: PaymentMode) => setPaymentMode(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reference (optional)</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g., CHQ-001"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!effectiveContractorId}>
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
