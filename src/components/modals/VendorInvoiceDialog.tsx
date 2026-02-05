import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  VendorInvoice,
  VendorInvoiceLineItem,
  ConsumableItem,
  Unit,
  Vendor,
} from '@/types';

export interface InvoiceLineForm {
  consumableItemId: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

// Stable empty array to prevent useEffect re-runs due to reference changes
const EMPTY_LINE_ITEMS: VendorInvoiceLineItem[] = [];

interface VendorInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: VendorInvoice | null;
  lineItems?: VendorInvoiceLineItem[];
  vendors: Vendor[];
  consumables: ConsumableItem[];
  units: Unit[];
  onSave: (invoice: Partial<VendorInvoice>, lines: InvoiceLineForm[], initialPaidAmount?: number) => void | Promise<void>;
}

const getUnitDisplay = (unitId: string, units: Unit[]) => {
  const u = units.find((x) => x.id === unitId);
  return u ? `${u.name} (${u.symbol})` : unitId;
};

const getItemDisplay = (item: ConsumableItem, units: Unit[]) => {
  const unit = units.find((u) => u.id === item.unitId);
  return `${item.name} - ${unit?.symbol ?? item.unitId}`;
};

export function VendorInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  lineItems = EMPTY_LINE_ITEMS,
  vendors,
  consumables,
  units,
  onSave,
}: VendorInvoiceDialogProps) {
  const [vendorId, setVendorId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [biltyNumber, setBiltyNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [lines, setLines] = useState<InvoiceLineForm[]>([]);
  const [initialPaidAmount, setInitialPaidAmount] = useState<number>(0);

  const allUnits = units;

  useEffect(() => {
    if (open) {
      if (invoice) {
        setVendorId(invoice.vendorId);
        setVehicleNumber(invoice.vehicleNumber);
        setBiltyNumber(invoice.biltyNumber);
        setInvoiceDate(
          new Date(invoice.invoiceDate).toISOString().split('T')[0]
        );
        setLines(
          lineItems.length > 0
            ? lineItems.map((li) => ({
              consumableItemId: li.consumableItemId,
              quantity: li.quantity,
              unitCost: li.unitCost,
              lineTotal: li.lineTotal,
            }))
            : [{ consumableItemId: '', quantity: 0, unitCost: 0, lineTotal: 0 }]
        );
      } else {
        setVendorId('');
        setVehicleNumber('');
        setBiltyNumber('');
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setLines([{ consumableItemId: '', quantity: 0, unitCost: 0, lineTotal: 0 }]);
        setInitialPaidAmount(0);
      }
    }
  }, [open, invoice, lineItems]);

  const updateLine = (index: number, field: keyof InvoiceLineForm, value: number | string) => {
    const newLines = [...lines];
    const line = { ...newLines[index], [field]: value };
    if (field === 'quantity' || field === 'unitCost') {
      const qty = field === 'quantity' ? Number(value) : line.quantity;
      const cost = field === 'unitCost' ? Number(value) : line.unitCost;
      line.lineTotal = qty * cost;
    }
    newLines[index] = line;
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { consumableItemId: '', quantity: 0, unitCost: 0, lineTotal: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const totalAmount = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  const [popoverContainer, setPopoverContainer] = useState<HTMLElement | null>(null);
  const contentRef = useCallback((el: HTMLDivElement | null) => {
    setPopoverContainer(el);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines.filter(
      (l) => l.consumableItemId && l.quantity > 0 && l.unitCost >= 0
    );
    if (validLines.length === 0) return;
    if (!vendorId || !invoiceDate) return;

    await onSave(
      {
        id: invoice?.id,
        vendorId,
        vehicleNumber: vehicleNumber.trim(),
        biltyNumber: biltyNumber.trim(),
        invoiceDate: new Date(invoiceDate),
        totalAmount,
        paidAmount: invoice?.paidAmount ?? 0,
        remainingAmount: invoice ? invoice.remainingAmount : totalAmount,
        createdBy: '1',
        createdAt: invoice?.createdAt ?? new Date(),
        invoiceNumber: invoice?.invoiceNumber,
      },
      validLines,
      initialPaidAmount > 0 ? initialPaidAmount : undefined
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={contentRef} className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? 'Edit Invoice' : 'Create Vendor Invoice'}</DialogTitle>
          <DialogDescription>
            Add line items (stock addition). Creating this invoice will update inventory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-24">Quantity</TableHead>
                  <TableHead className="w-28">Unit Cost</TableHead>
                  <TableHead className="w-28">Line Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Combobox
                        value={line.consumableItemId}
                        onValueChange={(value) =>
                          updateLine(index, 'consumableItemId', value)
                        }
                        options={consumables.map((item) => ({
                          value: String(item.id),
                          label: getItemDisplay(item, allUnits),
                        }))}
                        placeholder="Select item"
                        searchPlaceholder="Search items..."
                        triggerClassName="h-9"
                        container={popoverContainer}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={line.quantity || ''}
                        onChange={(e) =>
                          updateLine(index, 'quantity', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.unitCost || ''}
                        onChange={(e) =>
                          updateLine(index, 'unitCost', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {line.lineTotal.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeLine(index)}
                        disabled={lines.length <= 1}
                      >
                        ×
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                Add line
              </Button>
            </div>
          </div>

          <div className="flex justify-end text-lg font-semibold">
            Invoice Total: {totalAmount.toLocaleString()}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Combobox
                value={vendorId}
                onValueChange={setVendorId}
                options={vendors.map((v) => ({ value: String(v.id), label: v.name }))}
                placeholder="Select vendor"
                searchPlaceholder="Search vendors..."
                required
                container={popoverContainer}
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vehicle Number</Label>
              <Input
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g., TRK-4521"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Bilty Number</Label>
              <Input
                value={biltyNumber}
                onChange={(e) => setBiltyNumber(e.target.value)}
                placeholder="e.g., BLT-2024-001"
                required
              />
            </div>
          </div>

          {/* Initial Payment (only when creating new invoice) */}
          {!invoice && (
            <div className="space-y-2 rounded-md border p-3 bg-muted/30">
              <Label htmlFor="initialPaid">Initial Payment (Optional)</Label>
              <Input
                id="initialPaid"
                type="number"
                min={0}
                max={totalAmount}
                step={0.01}
                value={initialPaidAmount || ''}
                onChange={(e) => setInitialPaidAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                If paid at time of purchase, enter the amount. This will be recorded as the first payment.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{invoice ? 'Save Changes' : 'Create Invoice'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
