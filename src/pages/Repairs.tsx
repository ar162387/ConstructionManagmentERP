import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Wrench, DollarSign, MoreHorizontal } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCanEdit } from '@/contexts/ProjectContext';
import * as nonConsumableItemService from '@/services/nonConsumableItemService';
import * as nonConsumableMovementService from '@/services/nonConsumableMovementService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { NonConsumableItem } from '@/types';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function Repairs() {
  const { isAuthenticated } = useAuth();
  const canEdit = useCanEdit();
  const [items, setItems] = useState<NonConsumableItem[]>([]);
  const [repairMovements, setRepairMovements] = useState<
    Awaited<ReturnType<typeof nonConsumableMovementService.getRepairExpenses>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [repairOpen, setRepairOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NonConsumableItem | null>(null);
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = () => {
    Promise.all([
      nonConsumableItemService.getNonConsumableItems(),
      nonConsumableMovementService.getRepairExpenses({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    ])
      .then(([itemsData, repairsData]) => {
        setItems(itemsData);
        setRepairMovements(repairsData);
      })
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load repairs data.', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const damagedItems = items.filter((i) => i.damagedQty > 0);
  const totalRepairCost = repairMovements.reduce((sum, m) => sum + (m.cost ?? 0), 0);

  const openRepair = (item: NonConsumableItem) => {
    setSelectedItem(item);
    setQuantity('');
    setCost('');
    setRemarks('');
    setRepairOpen(true);
  };

  const submitRepair = async () => {
    if (!selectedItem) return;
    const qty = parseFloat(quantity);
    const costNum = parseFloat(cost);
    if (isNaN(qty) || qty <= 0 || qty > selectedItem.damagedQty) {
      toast({
        title: 'Invalid quantity',
        description: `Enter a quantity between 1 and ${selectedItem.damagedQty}.`,
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      await nonConsumableMovementService.createNonConsumableMovement({
        movementType: 'repair_damaged',
        nonConsumableItemId: selectedItem.id,
        quantity: qty,
        cost: isNaN(costNum) || costNum < 0 ? undefined : costNum,
        remarks: remarks.trim() || undefined,
      });
      toast({ title: 'Repair recorded', description: `${qty} repaired and moved to store. Cost recorded.` });
      setRepairOpen(false);
      setSelectedItem(null);
      loadData();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to record repair.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Repairs & Expenses</h1>
          <p className="text-muted-foreground">
            Repair damaged items and record cost. Repaired quantity moves back to store; cost is tracked for reporting.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Items with damaged qty
              </CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{damagedItems.length}</div>
              <p className="text-xs text-muted-foreground">Items that can be repaired</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Repair expenses (filtered)
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRepairCost)}</div>
              <p className="text-xs text-muted-foreground">
                Total repair cost in selected date range
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Items needing repair</CardTitle>
            <p className="text-sm text-muted-foreground">
              Items with damaged quantity &gt; 0. Use Repair to move quantity back to store and record cost.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Damaged qty</TableHead>
                  {canEdit && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {damagedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 3 : 2} className="text-center text-muted-foreground py-8">
                      No items with damaged quantity.
                    </TableCell>
                  </TableRow>
                ) : (
                  damagedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.damagedQty}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => openRepair(item)}>
                            Repair
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repair & maintenance expenses</CardTitle>
            <p className="text-sm text-muted-foreground">
              History of repair movements with cost. Filter by date range.
            </p>
            <div className="flex gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[140px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[140px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Created by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repairMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No repair expenses in selected range.
                    </TableCell>
                  </TableRow>
                ) : (
                  repairMovements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{format(new Date(m.createdAt), 'MMM d, yyyy HH:mm')}</TableCell>
                      <TableCell>{m.nonConsumableItem?.name ?? m.nonConsumableItemId}</TableCell>
                      <TableCell className="text-right">{m.quantity}</TableCell>
                      <TableCell className="text-right">{m.cost != null ? formatCurrency(m.cost) : '-'}</TableCell>
                      <TableCell>{m.createdBy?.name ?? '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={repairOpen} onOpenChange={setRepairOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repair damaged</DialogTitle>
            {selectedItem && (
              <p className="text-sm text-muted-foreground">
                {selectedItem.name} · Damaged quantity: {selectedItem.damagedQty}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity to repair</Label>
              <Input
                type="number"
                min={0.01}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Repair cost (optional)</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">Recorded as expense for reporting</p>
            </div>
            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g., Parts replaced"
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepairOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitRepair} disabled={submitting || !quantity.trim()}>
              {submitting ? 'Saving...' : 'Record repair'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
