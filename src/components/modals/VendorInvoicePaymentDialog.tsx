import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { VendorInvoice, VendorInvoicePayment, PaymentMode } from '@/types';

interface VendorInvoicePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: VendorInvoice | null;
  onSave: (payment: Omit<VendorInvoicePayment, 'id'>) => void;
}

export function VendorInvoicePaymentDialog({
  open,
  onOpenChange,
  invoice,
  onSave,
}: VendorInvoicePaymentDialogProps) {
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank_transfer');
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (open && invoice) {
      setAmount(invoice.remainingAmount);
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMode('bank_transfer');
      setReference('');
    }
  }, [open, invoice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || amount <= 0) return;
    onSave({
      invoiceId: invoice.id,
      amount,
      date: new Date(date),
      paymentMode,
      reference: reference.trim() || undefined,
      createdBy: '1',
    });
    onOpenChange(false);
  };

  const maxAmount = invoice ? invoice.remainingAmount : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Remaining due: {invoice?.remainingAmount?.toLocaleString() ?? 0}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              min={0}
              max={maxAmount}
              step={0.01}
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
            <Button type="submit">Record Payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
