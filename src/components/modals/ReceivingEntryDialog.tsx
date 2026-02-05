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
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { NonConsumableItem } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import * as nonConsumableItemService from '@/services/nonConsumableItemService';

export interface ReceivingLineForm {
  nonConsumableItemId: string;
  quantity: number;
  unitCost?: number;
  lineTotal?: number;
}

interface ReceivingEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NonConsumableItem[];
  onSave: (remarks: string | null, lines: ReceivingLineForm[]) => void | Promise<void>;
  onItemCreated?: () => void;
}

const emptyLine = (): ReceivingLineForm => ({
  nonConsumableItemId: '',
  quantity: 0,
  unitCost: undefined,
  lineTotal: undefined,
});

function QuickAddFooter({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    try {
      await onAdd(trimmed);
      setName('');
    } finally {
      setAdding(false);
    }
  };
  return (
    <div className="p-2 border-t flex gap-2 items-center">
      <Input
        placeholder="New item name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
        className="flex-1 h-8"
      />
      <Button type="button" size="sm" onClick={handleAdd} disabled={!name.trim() || adding}>
        {adding ? 'Adding...' : 'Add'}
      </Button>
    </div>
  );
}

export function ReceivingEntryDialog({
  open,
  onOpenChange,
  items,
  onSave,
  onItemCreated,
}: ReceivingEntryDialogProps) {
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<ReceivingLineForm[]>([emptyLine()]);
  const [costMode, setCostMode] = useState<'unit' | 'total'>('unit');
  const [popoverContainer, setPopoverContainer] = useState<HTMLElement | null>(null);
  const contentRef = useCallback((el: HTMLDivElement | null) => {
    setPopoverContainer(el);
  }, []);

  const itemOptions = items.map((i) => ({ value: i.id, label: i.name }));

  useEffect(() => {
    if (open) {
      setRemarks('');
      setLines([emptyLine()]);
      setCostMode('unit');
    }
  }, [open]);

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine()]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof ReceivingLineForm, value: number | string) => {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[index], [field]: value };
      const qty = field === 'quantity' ? Number(value) : line.quantity;
      const uCost = field === 'unitCost' ? Number(value) : line.unitCost;
      const lTotal = field === 'lineTotal' ? Number(value) : line.lineTotal;
      if (costMode === 'unit' && uCost != null && uCost !== undefined) {
        line.lineTotal = qty * uCost;
        line.unitCost = uCost;
      } else if (costMode === 'total' && lTotal != null && lTotal !== undefined && qty > 0) {
        line.unitCost = lTotal / qty;
        line.lineTotal = lTotal;
      }
      next[index] = line;
      return next;
    });
  };

  const handleQuickAddItem = async (name: string): Promise<NonConsumableItem | void> => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const created = await nonConsumableItemService.createNonConsumableItem({ name: trimmed });
      onItemCreated?.();
      return created;
    } catch {
      return undefined;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines.filter(
      (l) => l.nonConsumableItemId && l.quantity > 0 && (l.unitCost != null || l.lineTotal != null)
    );
    if (validLines.length === 0) {
      return;
    }
    const payload = validLines.map((l) => {
      const qty = l.quantity;
      if (costMode === 'unit' && l.unitCost != null) {
        return { nonConsumableItemId: l.nonConsumableItemId, quantity: qty, unitCost: l.unitCost };
      }
      if (l.lineTotal != null) {
        return { nonConsumableItemId: l.nonConsumableItemId, quantity: qty, lineTotal: l.lineTotal };
      }
      return { nonConsumableItemId: l.nonConsumableItemId, quantity: qty, unitCost: l.unitCost ?? 0 };
    });
    await onSave(remarks.trim() || null, payload);
    onOpenChange(false);
  };

  const totalValue = lines.reduce((sum, l) => {
    if (l.lineTotal != null) return sum + l.lineTotal;
    if (l.unitCost != null && l.quantity > 0) return sum + l.quantity * l.unitCost;
    return sum;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={contentRef} className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Receiving Entry</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add non-consumable items to store. Each line: item, quantity, and either unit cost or line total.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks (optional)</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g., Delivery from supplier X"
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="flex items-center gap-4">
            <Label>Cost per line:</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={costMode === 'unit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCostMode('unit')}
              >
                Unit cost
              </Button>
              <Button
                type="button"
                variant={costMode === 'total' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCostMode('total')}
              >
                Line total
              </Button>
            </div>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-[100px]">Qty</TableHead>
                  {costMode === 'unit' ? (
                    <TableHead className="w-[120px]">Unit cost</TableHead>
                  ) : (
                    <TableHead className="w-[120px]">Line total</TableHead>
                  )}
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Combobox
                        value={line.nonConsumableItemId}
                        onValueChange={(value) => updateLine(index, 'nonConsumableItemId', value)}
                        options={itemOptions}
                        placeholder="Select item"
                        searchPlaceholder="Search items..."
                        container={popoverContainer}
                        renderFooter={(close) => (
                          <QuickAddFooter
                            onAdd={async (name) => {
                              const created = await handleQuickAddItem(name);
                              if (created) {
                                updateLine(index, 'nonConsumableItemId', created.id);
                                close();
                              }
                            }}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0.01}
                        step="any"
                        value={line.quantity || ''}
                        onChange={(e) =>
                          updateLine(index, 'quantity', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      {costMode === 'unit' ? (
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={line.unitCost ?? ''}
                          onChange={(e) =>
                            updateLine(index, 'unitCost', parseFloat(e.target.value) ?? 0)
                          }
                          placeholder="0"
                        />
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={line.lineTotal ?? ''}
                          onChange={(e) =>
                            updateLine(index, 'lineTotal', parseFloat(e.target.value) ?? 0)
                          }
                          placeholder="0"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeLine(index)}
                        disabled={lines.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-2 h-4 w-4" />
            Add line
          </Button>
          {totalValue > 0 && (
            <p className="text-sm text-muted-foreground">
              Total value: {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(totalValue)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save receiving entry</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
