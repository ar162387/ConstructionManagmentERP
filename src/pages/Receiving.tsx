import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Package, MoreHorizontal, Eye, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCanEdit, useCanDelete } from '@/contexts/ProjectContext';
import * as receivingEntryService from '@/services/receivingEntryService';
import * as nonConsumableItemService from '@/services/nonConsumableItemService';
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
import { format } from 'date-fns';
import { ReceivingEntryDialog } from '@/components/modals/ReceivingEntryDialog';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';
import type { ReceivingEntry, NonConsumableItem } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function Receiving() {
  const { isAuthenticated } = useAuth();
  const canEdit = useCanEdit();
  const canDelete = useCanDelete();
  const [entries, setEntries] = useState<ReceivingEntry[]>([]);
  const [items, setItems] = useState<NonConsumableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<ReceivingEntry | null>(null);
  const [detailEntry, setDetailEntry] = useState<ReceivingEntry | null>(null);

  const loadData = () => {
    Promise.all([
      receivingEntryService.getReceivingEntries(),
      nonConsumableItemService.getNonConsumableItems(),
    ])
      .then(([entriesData, itemsData]) => {
        setEntries(entriesData);
        setItems(itemsData);
      })
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load receiving entries.', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount);

  const handleSave = async (
    remarks: string | null,
    lines: { nonConsumableItemId: string; quantity: number; unitCost?: number; lineTotal?: number }[]
  ) => {
    try {
      await receivingEntryService.createReceivingEntry({
        remarks: remarks ?? undefined,
        lineItems: lines.map((l) => ({
          nonConsumableItemId: l.nonConsumableItemId,
          quantity: l.quantity,
          ...(l.unitCost != null && { unitCost: l.unitCost }),
          ...(l.lineTotal != null && { lineTotal: l.lineTotal }),
        })),
      });
      toast({ title: 'Receiving entry saved', description: 'Stock has been added to store.' });
      setDialogOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to save receiving entry.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleDelete = (entry: ReceivingEntry) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      await receivingEntryService.deleteReceivingEntry(entryToDelete.id);
      toast({ title: 'Entry deleted', description: 'Receiving entry has been removed and stock reversed.' });
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
      loadData();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to delete entry.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const totalValue = entries.reduce((sum, e) => sum + (e.totalValue ?? 0), 0);

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Receiving (Non-Consumable)</h1>
            <p className="text-muted-foreground">
              Add non-consumable stock to the company store. Each entry adds quantities to Store.
            </p>
          </div>
          {canEdit && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New receiving entry
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total received value
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Sum of all receiving entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receiving entries</CardTitle>
            <p className="text-sm text-muted-foreground">
              List of receiving entries. Each entry adds items to Store.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead className="text-right">Total value</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  {(canEdit || canDelete) && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.createdAt), 'MMM d, yyyy HH:mm')}</TableCell>
                    <TableCell>{entry.createdBy?.name ?? '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.totalValue ?? 0)}</TableCell>
                    <TableCell className="text-right">{entry.lineItems?.length ?? 0}</TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem
                              onClick={() =>
                                receivingEntryService.getReceivingEntry(entry.id).then(setDetailEntry)
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View details
                            </DropdownMenuItem>
                            {canDelete && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(entry)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ReceivingEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        items={items}
        onSave={handleSave}
        onItemCreated={() => nonConsumableItemService.getNonConsumableItems().then(setItems)}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete receiving entry"
        description="This will reverse the stock added by this entry. Are you sure?"
        onConfirm={handleConfirmDelete}
      />

      {detailEntry && (
        <ReceivingEntryDetailSheet
          entry={detailEntry}
          open={!!detailEntry}
          onOpenChange={(open) => !open && setDetailEntry(null)}
          formatCurrency={formatCurrency}
        />
      )}
    </AppLayout>
  );
}

function ReceivingEntryDetailSheet({
  entry,
  open,
  onOpenChange,
  formatCurrency,
}: {
  entry: ReceivingEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatCurrency: (n: number) => string;
}) {
  return (
    <div
      className={`fixed inset-y-0 right-0 w-full max-w-md bg-background border-l shadow-lg z-50 transform transition-transform ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Receiving entry #{entry.id}</h2>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            ×
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {entry.createdBy?.name ?? '-'} · {new Date(entry.createdAt).toLocaleString()}
        </p>
        {entry.remarks && <p className="text-sm">{entry.remarks}</p>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit cost</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entry.lineItems?.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.nonConsumableItem?.name ?? line.nonConsumableItemId}</TableCell>
                <TableCell className="text-right">{line.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(line.unitCost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(line.lineTotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="font-medium">Total: {formatCurrency(entry.totalValue ?? 0)}</p>
      </div>
    </div>
  );
}
