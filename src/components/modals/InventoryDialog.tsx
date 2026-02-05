import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConsumableItem, NonConsumableItem, Unit } from '@/types';

interface InventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consumableItem?: ConsumableItem | null;
  nonConsumableItem?: NonConsumableItem | null;
  initialTab?: 'consumable' | 'non-consumable';
  /** Units from API (and any newly created). */
  units?: Unit[];
  onAddCustomUnit?: (unit: { name: string; symbol: string }) => void | Promise<Unit | void>;
  onSaveConsumable: (data: Partial<ConsumableItem>) => void | Promise<void>;
  onSaveNonConsumable: (data: Partial<NonConsumableItem>) => void | Promise<void>;
}

export function InventoryDialog({
  open,
  onOpenChange,
  consumableItem,
  nonConsumableItem,
  initialTab,
  units = [],
  onAddCustomUnit,
  onSaveConsumable,
  onSaveNonConsumable,
}: InventoryDialogProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab ?? 'consumable');

  const [consumableData, setConsumableData] = useState({
    name: '',
    unitId: '',
    currentStock: 0,
  });

  const [showCustomUnitInput, setShowCustomUnitInput] = useState(false);
  const [customUnitInput, setCustomUnitInput] = useState('');

  const [nonConsumableData, setNonConsumableData] = useState<{ name: string }>({
    name: '',
  });

  const OTHER_UNIT_VALUE = '__other__';
  const allUnits = units;
  const unitOptions = [
    ...allUnits.map((u) => ({ value: String(u.id), label: `${u.name} (${u.symbol || u.name})` })),
    { value: OTHER_UNIT_VALUE, label: 'Other' },
  ];

  useEffect(() => {
    if (open) {
      if (consumableItem) {
        setActiveTab('consumable');
        setConsumableData({
          name: consumableItem.name,
          unitId: consumableItem.unitId,
          currentStock: consumableItem.currentStock,
        });
        setShowCustomUnitInput(false);
        setCustomUnitInput('');
      } else if (nonConsumableItem) {
        setActiveTab('non-consumable');
        setNonConsumableData({
          name: nonConsumableItem.name,
        });
      } else {
        setActiveTab(initialTab || 'consumable');
        setConsumableData({
          name: '',
          unitId: units[0]?.id || '',
          currentStock: 0,
        });
        setShowCustomUnitInput(false);
        setCustomUnitInput('');
        setNonConsumableData({
          name: '',
        });
      }
    }
  }, [open, consumableItem, nonConsumableItem, initialTab, units]);

  const parseCustomUnit = (input: string): { name: string; symbol: string } => {
    const trimmed = input.trim();
    const match = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (match) {
      return { name: match[1].trim(), symbol: match[2].trim() };
    }
    return { name: trimmed, symbol: trimmed };
  };

  const handleSubmitConsumable = async (e: React.FormEvent) => {
    e.preventDefault();
    let unitId: string;
    if (showCustomUnitInput && customUnitInput.trim()) {
      const { name, symbol } = parseCustomUnit(customUnitInput);
      const created = await onAddCustomUnit?.({ name, symbol });
      unitId = (created && 'id' in created && created.id) ? created.id : consumableData.unitId;
    } else {
      unitId = consumableData.unitId;
    }
    if (!unitId) return;
    await onSaveConsumable({
      id: consumableItem?.id,
      name: consumableData.name,
      unitId,
      currentStock: consumableData.currentStock,
    });
    onOpenChange(false);
  };

  const handleSubmitNonConsumable = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveNonConsumable({
      name: nonConsumableData.name.trim(),
      id: nonConsumableItem?.id,
    });
    onOpenChange(false);
  };

  const isEditingConsumable = !!consumableItem;
  const isEditing = !!(consumableItem || nonConsumableItem);

  const [popoverContainer, setPopoverContainer] = useState<HTMLElement | null>(null);
  const contentRef = useCallback((el: HTMLDivElement | null) => {
    setPopoverContainer(el);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={contentRef} className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Add'} Inventory Item</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="consumable" disabled={!!nonConsumableItem}>
              Consumable
            </TabsTrigger>
            <TabsTrigger value="non-consumable" disabled={!!consumableItem}>
              Non-Consumable
            </TabsTrigger>
          </TabsList>

          <TabsContent value="consumable">
            <form onSubmit={handleSubmitConsumable} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="c-name">Item Name</Label>
                <Input
                  id="c-name"
                  value={consumableData.name}
                  onChange={(e) => setConsumableData({ ...consumableData, name: e.target.value })}
                  placeholder="e.g., Portland Cement"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Combobox
                  value={showCustomUnitInput ? OTHER_UNIT_VALUE : (consumableData.unitId || allUnits[0]?.id || '')}
                  onValueChange={(value) => {
                    if (value === OTHER_UNIT_VALUE) {
                      setShowCustomUnitInput(true);
                      setCustomUnitInput('');
                      setConsumableData((prev) => ({ ...prev, unitId: '' }));
                    } else {
                      setShowCustomUnitInput(false);
                      setCustomUnitInput('');
                      setConsumableData((prev) => ({ ...prev, unitId: value }));
                    }
                  }}
                  options={unitOptions}
                  placeholder="Select unit"
                  searchPlaceholder="Search units..."
                  container={popoverContainer}
                />
                {showCustomUnitInput && (
                  <div className="space-y-2 mt-2">
                    <Label htmlFor="custom-unit">Enter new unit</Label>
                    <Input
                      id="custom-unit"
                      value={customUnitInput}
                      onChange={(e) => setCustomUnitInput(e.target.value)}
                      placeholder="e.g., Cubic Meter (m³)"
                    />
                    <p className="text-xs text-muted-foreground">
                      This unit will be added to the list for future use.
                    </p>
                  </div>
                )}
              </div>
              {isEditingConsumable && (
                <div className="space-y-2">
                  <Label htmlFor="currentStock">Current Stock (manual adjustment)</Label>
                  <Input
                    id="currentStock"
                    type="number"
                    min={0}
                    value={consumableData.currentStock}
                    onChange={(e) =>
                      setConsumableData({ ...consumableData, currentStock: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={showCustomUnitInput && !customUnitInput.trim()}>
                  {isEditingConsumable ? 'Save Changes' : 'Add Item'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="non-consumable">
            <form onSubmit={handleSubmitNonConsumable} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="nc-name">Item Name</Label>
                <Input
                  id="nc-name"
                  value={nonConsumableData.name}
                  onChange={(e) => setNonConsumableData({ ...nonConsumableData, name: e.target.value })}
                  placeholder="e.g., Laptop, Concrete Mixer"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Names are unique case-insensitively. Add stock via Receiving; move via Store / Project inventory.
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">{nonConsumableItem ? 'Save Changes' : 'Add Item'}</Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
