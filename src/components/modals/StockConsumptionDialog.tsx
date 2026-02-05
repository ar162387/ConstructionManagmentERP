import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { useProject } from '@/contexts/ProjectContext';
import type { StockConsumptionEntry, StockConsumptionLineItem } from '@/types';
import { ConsumableItem, Unit } from '@/types';

export interface ConsumptionLineForm {
  consumableItemId: string;
  quantity: number;
}

interface StockConsumptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consumables: ConsumableItem[];
  units: Unit[];
  entry?: StockConsumptionEntry & { lineItems?: StockConsumptionLineItem[] } | null;
  onSave: (projectId: string, remarks: string, lines: ConsumptionLineForm[], entryId?: string) => void | Promise<void>;
}

const getItemDisplay = (item: ConsumableItem, units: Unit[]) => {
  const unit = units.find((u) => u.id === item.unitId);
  return `${item.name} (${unit?.symbol ?? item.unitId})`;
};

export function StockConsumptionDialog({
  open,
  onOpenChange,
  consumables,
  units,
  entry,
  onSave,
}: StockConsumptionDialogProps) {
  const { availableProjects } = useProject();
  const [projectId, setProjectId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<ConsumptionLineForm[]>([
    { consumableItemId: '', quantity: 0 },
  ]);

  useEffect(() => {
    if (open) {
      if (entry) {
        setProjectId(entry.projectId);
        setRemarks(entry.remarks ?? '');
        setLines(
          entry.lineItems && entry.lineItems.length > 0
            ? entry.lineItems.map((li) => ({
                consumableItemId: li.consumableItemId,
                quantity: li.quantity,
              }))
            : [{ consumableItemId: '', quantity: 0 }]
        );
      } else {
        setProjectId('');
        setRemarks('');
        setLines([{ consumableItemId: '', quantity: 0 }]);
      }
    }
  }, [open, entry]);

  const updateLine = (index: number, field: keyof ConsumptionLineForm, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { consumableItemId: '', quantity: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const [popoverContainer, setPopoverContainer] = useState<HTMLElement | null>(null);
  const contentRef = useCallback((el: HTMLDivElement | null) => {
    setPopoverContainer(el);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines.filter(
      (l) => l.consumableItemId && l.quantity > 0
    );
    if (validLines.length === 0) return;
    if (!entry && !projectId) return;

    await onSave(entry ? entry.projectId : projectId, remarks.trim(), validLines, entry?.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={contentRef} className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit Stock Consumption Entry' : 'Create Stock Consumption Entry'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {entry
              ? 'Editing will adjust inventory based on quantity changes.'
              : 'Project-based. Creating this entry will deduct stock from inventory.'}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!entry && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Combobox
                value={projectId}
                onValueChange={setProjectId}
                options={availableProjects
                  .filter((p) => p.status === 'active')
                  .map((proj) => ({ value: String(proj.id), label: proj.name }))}
                placeholder="Select project"
                searchPlaceholder="Search projects..."
                required
                container={popoverContainer}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Remarks (where the stock went)</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g., Foundation work - Block A"
              rows={3}
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-32">Quantity</TableHead>
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
                          label: getItemDisplay(item, units),
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
                        min={1}
                        step={1}
                        value={line.quantity || ''}
                        onChange={(e) =>
                          updateLine(
                            index,
                            'quantity',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                      />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{entry ? 'Save Changes' : 'Create Entry'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
