import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Search, Package, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProject, useCanEdit, useCanDelete } from '@/contexts/ProjectContext';
import * as stockConsumptionService from '@/services/stockConsumptionService';
import * as consumableItemService from '@/services/consumableItemService';
import * as unitService from '@/services/unitService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Combobox } from '@/components/ui/combobox';
import { format } from 'date-fns';
import { StockConsumptionDialog, ConsumptionLineForm } from '@/components/modals/StockConsumptionDialog';
import type { StockConsumptionEntry } from '@/types';
import type { StockConsumptionLineItem } from '@/types';
import type { ConsumableItem } from '@/types';
import type { Unit } from '@/types';
import { toast } from '@/hooks/use-toast';

function getItemName(
  consumableItemId: string,
  consumables: ConsumableItem[],
  units: Unit[]
): string {
  const item = consumables.find((c) => c.id === consumableItemId);
  if (!item) return consumableItemId;
  const unit = units.find((u) => u.id === item.unitId);
  return `${item.name} (${unit?.symbol ?? item.unitId})`;
}

export default function StockConsumption() {
  const { isAuthenticated } = useAuth();
  const { selectedProjectId, availableProjects } = useProject();
  const canEdit = useCanEdit();
  const canDelete = useCanDelete();
  const [entries, setEntries] = useState<(StockConsumptionEntry & { lineItems?: StockConsumptionLineItem[] })[]>([]);
  const [consumables, setConsumables] = useState<ConsumableItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<(StockConsumptionEntry & { lineItems?: StockConsumptionLineItem[] }) | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const loadEntries = (projectId?: string) => {
    stockConsumptionService.getStockConsumptionEntries(projectId).then(setEntries).catch(() => {
      toast({ title: 'Error', description: 'Failed to load consumption entries.', variant: 'destructive' });
    });
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      stockConsumptionService.getStockConsumptionEntries(),
      consumableItemService.getConsumableItems(),
      unitService.getUnits(),
    ])
      .then(([entriesData, consumablesData, unitsData]) => {
        if (!cancelled) {
          setEntries(entriesData);
          setConsumables(consumablesData);
          setUnits(unitsData);
        }
      })
      .catch(() => {
        if (!cancelled) toast({ title: 'Error', description: 'Failed to load data.', variant: 'destructive' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const filteredEntries = entries.filter((entry) => {
    const matchContextProject =
      selectedProjectId == null || entry.projectId === selectedProjectId;
    const matchProject =
      projectFilter === 'all' || entry.projectId === projectFilter;
    const project = availableProjects.find((p) => p.id === entry.projectId);
    const matchSearch =
      !searchQuery.trim() ||
      (entry.remarks ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      project?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchContextProject && matchProject && matchSearch;
  });

  const handleSave = async (
    projectId: string,
    remarks: string,
    lines: ConsumptionLineForm[],
    entryId?: string
  ) => {
    try {
      if (entryId) {
        await stockConsumptionService.updateStockConsumptionEntry(entryId, {
          remarks: remarks || undefined,
          lineItems: lines.map((l) => ({
            consumableItemId: l.consumableItemId,
            quantity: l.quantity,
          })),
        });
        toast({
          title: 'Consumption Entry Updated',
          description: 'Stock consumption entry updated. Inventory adjusted.',
        });
      } else {
        await stockConsumptionService.createStockConsumptionEntry({
          projectId,
          remarks: remarks || undefined,
          lineItems: lines.map((l) => ({
            consumableItemId: l.consumableItemId,
            quantity: l.quantity,
          })),
        });
        toast({
          title: 'Consumption Entry Created',
          description: 'Stock consumption recorded for project. Inventory deducted.',
        });
      }
      setDialogOpen(false);
      setSelectedEntry(null);
      loadEntries();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Failed to save consumption entry.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleEditEntry = (entry: StockConsumptionEntry & { lineItems?: StockConsumptionLineItem[] }) => {
    setSelectedEntry(entry);
    setDialogOpen(true);
  };

  const handleDeleteEntry = async () => {
    if (!selectedEntry) return;
    try {
      await stockConsumptionService.deleteStockConsumptionEntry(selectedEntry.id);
      toast({
        title: 'Consumption Entry Deleted',
        description: 'Stock consumption entry deleted. Inventory restored.',
      });
      setDeleteDialogOpen(false);
      setSelectedEntry(null);
      loadEntries();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Failed to delete consumption entry.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">Loading consumption entries...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Stock Consumption</h1>
            <p className="text-muted-foreground">
              Project-based consumption entries. Creating an entry deducts stock from inventory.
            </p>
          </div>
          <Button className="w-fit" onClick={() => { setSelectedEntry(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            New Consumption Entry
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Entries
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {entries.length}
              </div>
              <p className="text-xs text-muted-foreground">Project-scoped</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by remarks or project..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Combobox
            value={projectFilter}
            onValueChange={setProjectFilter}
            options={[
              { value: 'all', label: 'All Projects' },
              ...availableProjects.map((proj) => ({ value: proj.id, label: proj.name })),
            ]}
            placeholder="Filter by project"
            searchPlaceholder="Search projects..."
            triggerClassName="w-[200px]"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Consumption Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Items</TableHead>
                  {(canEdit || canDelete) && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => {
                  const project = availableProjects.find(
                    (p) => p.id === entry.projectId
                  );
                  const lineItems = entry.lineItems ?? [];
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {format(entry.createdAt, 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{project?.name ?? entry.projectId}</TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {entry.remarks || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {lineItems.map((li) => (
                            <span key={li.id} className="text-sm">
                              {getItemName(li.consumableItemId, consumables, units)}: {li.quantity}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              {canEdit && (
                                <DropdownMenuItem onClick={() => handleEditEntry(entry)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setSelectedEntry(entry);
                                    setDeleteDialogOpen(true);
                                  }}
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
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stock Consumption Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the consumption entry and restore the stock to inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteEntry();
              }}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StockConsumptionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedEntry(null);
        }}
        consumables={consumables}
        units={units}
        entry={selectedEntry}
        onSave={handleSave}
      />
    </AppLayout>
  );
}
