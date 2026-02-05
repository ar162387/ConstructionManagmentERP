import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Search, Package, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProject, useCanEdit, useCanDelete } from '@/contexts/ProjectContext';
import * as consumableItemService from '@/services/consumableItemService';
import * as unitService from '@/services/unitService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { InventoryDialog } from '@/components/modals/InventoryDialog';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';
import { ConsumableItem, Unit } from '@/types';
import { toast } from '@/hooks/use-toast';

function getUnitDisplay(unitId: string, units: Unit[]): string {
  const u = units.find((x) => x.id === unitId);
  return u ? `${u.name} (${u.symbol})` : unitId;
}

export default function Inventory() {
  const { isAuthenticated } = useAuth();
  const { selectedProjectId } = useProject();
  const canEdit = useCanEdit();
  const canDelete = useCanDelete();
  const [consumables, setConsumables] = useState<ConsumableItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConsumable, setSelectedConsumable] = useState<ConsumableItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ConsumableItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    Promise.all([consumableItemService.getConsumableItems(), unitService.getUnits()])
      .then(([consumablesData, unitsData]) => {
        setConsumables(consumablesData);
        setUnits(unitsData);
      })
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load inventory.', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleAddItem = () => {
    setSelectedConsumable(null);
    setInventoryDialogOpen(true);
  };

  const handleEditConsumable = (item: ConsumableItem) => {
    setSelectedConsumable(item);
    setInventoryDialogOpen(true);
  };

  const handleSaveConsumable = async (data: Partial<ConsumableItem>) => {
    try {
      if (selectedConsumable?.id) {
        await consumableItemService.updateConsumableItem(selectedConsumable.id, {
          name: data.name,
          unitId: data.unitId,
          currentStock: data.currentStock,
        });
        toast({
          title: 'Item Updated',
          description: 'Consumable item has been updated successfully.',
        });
      } else {
        await consumableItemService.createConsumableItem({
          name: data.name!,
          unitId: data.unitId!,
          currentStock: data.currentStock ?? 0,
        });
        toast({
          title: 'Item Added',
          description: 'Consumable item has been added successfully.',
        });
      }
      setInventoryDialogOpen(false);
      const list = await consumableItemService.getConsumableItems();
      setConsumables(list);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Failed to save item.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleAddCustomUnit = async (unit: { name: string; symbol: string }): Promise<Unit | void> => {
    try {
      const created = await unitService.createUnit({ name: unit.name, symbol: unit.symbol });
      toast({ title: 'Unit Added', description: `Unit "${unit.name}" has been added.` });
      const list = await unitService.getUnits();
      setUnits(list);
      return list.find((u) => u.name === created.name && u.symbol === created.symbol) ?? created;
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Failed to add unit.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleDeleteConsumable = (item: ConsumableItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await consumableItemService.deleteConsumableItem(itemToDelete.id);
      const list = await consumableItemService.getConsumableItems();
      setConsumables(list);
      toast({
        title: 'Item Deleted',
        description: 'The item has been deleted successfully.',
      });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to delete item.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const filteredConsumables = consumables.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getUnitDisplay(item.unitId, units).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventory Management</h1>
            <p className="text-muted-foreground">
              Consumable master list. Stock is updated via Vendor Invoices and consumed via Stock Consumption.
            </p>
          </div>
          <Button className="w-fit" onClick={handleAddItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Consumable Items
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{consumables.length}</div>
              <p className="text-xs text-muted-foreground">Master list (company)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Stock
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {consumables.reduce((sum, c) => sum + (c.currentStock ?? 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">Across all consumables</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search inventory..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Consumable Items</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add items with name and unit (0 quantity). Stock is updated via Vendor Invoices and
                  consumed via Stock Consumption.
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConsumables.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getUnitDisplay(item.unitId, units)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.currentStock}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              {canEdit && (
                                <DropdownMenuItem onClick={() => handleEditConsumable(item)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteConsumable(item)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        </div>
      </div>

      <InventoryDialog
        open={inventoryDialogOpen}
        onOpenChange={setInventoryDialogOpen}
        consumableItem={selectedConsumable}
        nonConsumableItem={null}
        initialTab="consumable"
        units={units}
        onAddCustomUnit={handleAddCustomUnit}
        onSaveConsumable={handleSaveConsumable}
        onSaveNonConsumable={async () => {}}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Item"
        description="Are you sure you want to delete this inventory item? This action cannot be undone."
        onConfirm={handleConfirmDeleteItem}
      />
    </AppLayout>
  );
}
