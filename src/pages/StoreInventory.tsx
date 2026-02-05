import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Package,
  ArrowRightCircle,
  AlertTriangle,
  XCircle,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Warehouse,
  FolderOpen,
  Wrench,
  History,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProject, useCanEdit, useCanDelete } from '@/contexts/ProjectContext';
import * as nonConsumableItemService from '@/services/nonConsumableItemService';
import * as nonConsumableMovementService from '@/services/nonConsumableMovementService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Combobox } from '@/components/ui/combobox';
import { InventoryDialog } from '@/components/modals/InventoryDialog';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';
import type {
  NonConsumableItem,
  NonConsumableProjectAssignment,
  NonConsumableMovement,
  Project,
} from '@/types';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount);

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  assign_to_project: 'Assign to project',
  return_to_store: 'Return to store',
  mark_lost: 'Mark lost',
  mark_damaged: 'Mark damaged',
  repair_damaged: 'Repair',
  mark_lost_from_damaged: 'Mark lost (unrepairable)',
  restore_from_lost: 'Restore from lost',
  restore_from_damaged: 'Restore from damaged',
  reverse_repair: 'Reverse repair',
  restore_to_damaged: 'Restore to damaged',
};

export default function StoreInventory() {
  const { isAuthenticated } = useAuth();
  const { availableProjects, selectedProjectId, setSelectedProjectId } = useProject();
  const canEdit = useCanEdit();
  const canDelete = useCanDelete();

  const [items, setItems] = useState<NonConsumableItem[]>([]);
  const [repairMovements, setRepairMovements] = useState<NonConsumableMovement[]>([]);
  const [allMovements, setAllMovements] = useState<NonConsumableMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Store tab
  const [assignOpen, setAssignOpen] = useState(false);
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<NonConsumableItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<NonConsumableItem | null>(null);
  const [lostOpen, setLostOpen] = useState(false);
  const [damagedOpen, setDamagedOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NonConsumableItem | null>(null);
  const [quantity, setQuantity] = useState('');
  const [projectId, setProjectId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Project tab
  const [returnOpen, setReturnOpen] = useState(false);
  const [projectLostOpen, setProjectLostOpen] = useState(false);
  const [projectDamagedOpen, setProjectDamagedOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<{
    item: NonConsumableItem;
    projectId: string;
    quantity: number;
  } | null>(null);

  // Repairs tab
  const [repairOpen, setRepairOpen] = useState(false);
  const [lostFromDamagedOpen, setLostFromDamagedOpen] = useState(false);
  const [cost, setCost] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Activity tab
  const [activityDateFrom, setActivityDateFrom] = useState('');
  const [activityDateTo, setActivityDateTo] = useState('');

  const loadData = () => {
    setLoading(true);
    nonConsumableItemService
      .getNonConsumableItems()
      .then(setItems)
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load store inventory.', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  };

  const loadRepairExpenses = () => {
    nonConsumableMovementService
      .getRepairExpenses({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      .then(setRepairMovements)
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load repair expenses.', variant: 'destructive' });
      });
  };

  const loadAllMovements = () => {
    nonConsumableMovementService
      .getNonConsumableMovements({
        dateFrom: activityDateFrom || undefined,
        dateTo: activityDateTo || undefined,
      })
      .then(setAllMovements)
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load activity.', variant: 'destructive' });
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadRepairExpenses();
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadAllMovements();
  }, [activityDateFrom, activityDateTo]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const projectOptions = availableProjects.map((p: Project) => ({ value: p.id, label: p.name }));
  const projectIdForProjectTab = selectedProjectId ?? availableProjects[0]?.id ?? '';
  const assignedItems = items.flatMap((item) =>
    (item.assignments ?? [])
      .filter((a) => a.projectId === projectIdForProjectTab && a.quantity > 0)
      .map((a) => ({ item, assignment: a }))
  );
  const damagedItems = items.filter((i) => i.damagedQty > 0);

  // General non-consumable KPIs
  const totalStore = items.reduce((sum, i) => sum + i.storeQty, 0);
  const totalDamaged = items.reduce((sum, i) => sum + i.damagedQty, 0);
  const totalLost = items.reduce((sum, i) => sum + i.lostQty, 0);
  const totalAssigned = items.reduce((sum, i) => sum + i.totalAssigned, 0);
  const itemsNeedingRepair = damagedItems.length;
  const totalRepairCost = repairMovements.reduce((sum, m) => sum + (m.cost ?? 0), 0);

  // Store tab handlers
  const openAssign = (item: NonConsumableItem) => {
    setSelectedItem(item);
    setQuantity('');
    setProjectId('');
    setRemarks('');
    setAssignOpen(true);
  };
  const openMarkLost = (item: NonConsumableItem) => {
    setSelectedItem(item);
    setQuantity('');
    setRemarks('');
    setLostOpen(true);
  };
  const openMarkDamaged = (item: NonConsumableItem) => {
    setSelectedItem(item);
    setQuantity('');
    setRemarks('');
    setDamagedOpen(true);
  };
  const handleAddItem = () => {
    setSelectedForEdit(null);
    setInventoryDialogOpen(true);
  };
  const handleEditItem = (item: NonConsumableItem) => {
    setSelectedForEdit(item);
    setInventoryDialogOpen(true);
  };
  const handleSaveNonConsumable = async (data: Partial<NonConsumableItem>) => {
    try {
      if (selectedForEdit?.id) {
        await nonConsumableItemService.updateNonConsumableItem(selectedForEdit.id, { name: data.name });
        toast({ title: 'Item Updated', description: 'Non-consumable item has been updated successfully.' });
      } else {
        await nonConsumableItemService.createNonConsumableItem({ name: data.name! });
        toast({ title: 'Item Added', description: 'Non-consumable item has been added successfully.' });
      }
      setInventoryDialogOpen(false);
      setSelectedForEdit(null);
      loadData();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to save item.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };
  const handleDeleteItem = (item: NonConsumableItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await nonConsumableItemService.deleteNonConsumableItem(itemToDelete.id);
      toast({ title: 'Item Deleted', description: 'The item has been deleted successfully.' });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      loadData();
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

  const submitAssign = async () => {
    if (!selectedItem || !projectId) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0 || qty > selectedItem.storeQty) {
      toast({ title: 'Invalid quantity', description: `Enter a quantity between 1 and ${selectedItem.storeQty}.`, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await nonConsumableMovementService.createNonConsumableMovement({
        movementType: 'assign_to_project',
        nonConsumableItemId: selectedItem.id,
        quantity: qty,
        projectId,
        remarks: remarks.trim() || undefined,
      });
      toast({ title: 'Assigned', description: `${qty} assigned to project.` });
      setAssignOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to assign.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitMarkLost = async () => {
    if (!selectedItem) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0 || qty > selectedItem.storeQty) {
      toast({ title: 'Invalid quantity', description: `Enter a quantity between 1 and ${selectedItem.storeQty}.`, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await nonConsumableMovementService.createNonConsumableMovement({
        movementType: 'mark_lost',
        nonConsumableItemId: selectedItem.id,
        quantity: qty,
        remarks: remarks.trim() || undefined,
      });
      toast({ title: 'Marked lost', description: `${qty} marked as lost.` });
      setLostOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to mark lost.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitMarkDamaged = async () => {
    if (!selectedItem) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0 || qty > selectedItem.storeQty) {
      toast({ title: 'Invalid quantity', description: `Enter a quantity between 1 and ${selectedItem.storeQty}.`, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await nonConsumableMovementService.createNonConsumableMovement({
        movementType: 'mark_damaged',
        nonConsumableItemId: selectedItem.id,
        quantity: qty,
        remarks: remarks.trim() || undefined,
      });
      toast({ title: 'Marked damaged', description: `${qty} marked as damaged.` });
      setDamagedOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to mark damaged.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Project tab handlers
  const openReturn = (item: NonConsumableItem, assignment: NonConsumableProjectAssignment) => {
    setSelectedAssignment({ item, projectId: assignment.projectId, quantity: assignment.quantity });
    setQuantity('');
    setRemarks('');
    setReturnOpen(true);
  };
  const openProjectMarkLost = (item: NonConsumableItem, assignment: NonConsumableProjectAssignment) => {
    setSelectedAssignment({ item, projectId: assignment.projectId, quantity: assignment.quantity });
    setQuantity('');
    setRemarks('');
    setProjectLostOpen(true);
  };
  const openProjectMarkDamaged = (item: NonConsumableItem, assignment: NonConsumableProjectAssignment) => {
    setSelectedAssignment({ item, projectId: assignment.projectId, quantity: assignment.quantity });
    setQuantity('');
    setRemarks('');
    setProjectDamagedOpen(true);
  };

  const submitReturn = async () => {
    if (!selectedAssignment) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0 || qty > selectedAssignment.quantity) {
      toast({ title: 'Invalid quantity', description: `Enter a quantity between 1 and ${selectedAssignment.quantity}.`, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await nonConsumableMovementService.createNonConsumableMovement({
        movementType: 'return_to_store',
        nonConsumableItemId: selectedAssignment.item.id,
        quantity: qty,
        projectId: selectedAssignment.projectId,
        remarks: remarks.trim() || undefined,
      });
      toast({ title: 'Returned', description: `${qty} returned to store.` });
      setReturnOpen(false);
      setSelectedAssignment(null);
      loadData();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to return.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitProjectMarkLost = async () => {
    if (!selectedAssignment) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0 || qty > selectedAssignment.quantity) {
      toast({ title: 'Invalid quantity', description: `Enter a quantity between 1 and ${selectedAssignment.quantity}.`, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await nonConsumableMovementService.createNonConsumableMovement({
        movementType: 'mark_lost',
        nonConsumableItemId: selectedAssignment.item.id,
        quantity: qty,
        projectId: selectedAssignment.projectId,
        remarks: remarks.trim() || undefined,
      });
      toast({ title: 'Marked lost', description: `${qty} marked as lost.` });
      setProjectLostOpen(false);
      setSelectedAssignment(null);
      loadData();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to mark lost.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitProjectMarkDamaged = async () => {
    if (!selectedAssignment) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0 || qty > selectedAssignment.quantity) {
      toast({ title: 'Invalid quantity', description: `Enter a quantity between 1 and ${selectedAssignment.quantity}.`, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await nonConsumableMovementService.createNonConsumableMovement({
        movementType: 'mark_damaged',
        nonConsumableItemId: selectedAssignment.item.id,
        quantity: qty,
        projectId: selectedAssignment.projectId,
        remarks: remarks.trim() || undefined,
      });
      toast({ title: 'Marked damaged', description: `${qty} marked as damaged.` });
      setProjectDamagedOpen(false);
      setSelectedAssignment(null);
      loadData();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to mark damaged.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Repairs tab handlers
  const openRepair = (item: NonConsumableItem) => {
    setSelectedItem(item);
    setQuantity('');
    setCost('');
    setRemarks('');
    setRepairOpen(true);
  };
  const openMarkLostFromDamaged = (item: NonConsumableItem) => {
    setSelectedItem(item);
    setQuantity('');
    setRemarks('');
    setLostFromDamagedOpen(true);
  };
  const submitRepair = async () => {
    if (!selectedItem) return;
    const qty = parseFloat(quantity);
    const costNum = parseFloat(cost);
    if (isNaN(qty) || qty <= 0 || qty > selectedItem.damagedQty) {
      toast({ title: 'Invalid quantity', description: `Enter a quantity between 1 and ${selectedItem.damagedQty}.`, variant: 'destructive' });
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
        err && typeof err === 'object' && 'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to record repair.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };
  const submitMarkLostFromDamaged = async () => {
    if (!selectedItem) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0 || qty > selectedItem.damagedQty) {
      toast({ title: 'Invalid quantity', description: `Enter a quantity between 1 and ${selectedItem.damagedQty}.`, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await nonConsumableMovementService.createNonConsumableMovement({
        movementType: 'mark_lost_from_damaged',
        nonConsumableItemId: selectedItem.id,
        quantity: qty,
        remarks: remarks.trim() || undefined,
      });
      toast({ title: 'Marked as lost', description: `${qty} marked as lost (unrepairable).` });
      setLostFromDamagedOpen(false);
      setSelectedItem(null);
      loadData();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to mark as lost.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProject = availableProjects.find((p) => p.id === projectIdForProjectTab);

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
            <h1 className="text-2xl font-bold tracking-tight">Store Inventory</h1>
            <p className="text-muted-foreground">
              Non-consumable items: store, project assignments, and repairs. Add items, assign to projects, or manage damaged equipment.
            </p>
          </div>
          {canEdit && (
            <Button className="w-fit" onClick={handleAddItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          )}
        </div>

        {/* General non-consumable KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In store</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStore}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In use (assigned)</CardTitle>
              <ArrowRightCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAssigned}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Damaged</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{totalDamaged}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lost</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{totalLost}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="store" className="space-y-4">
          <TabsList>
            <TabsTrigger value="store">
              <Warehouse className="h-4 w-4 mr-2" />
              Store
            </TabsTrigger>
            <TabsTrigger value="project">
              <FolderOpen className="h-4 w-4 mr-2" />
              Project
            </TabsTrigger>
            <TabsTrigger value="repairs">
              <Wrench className="h-4 w-4 mr-2" />
              Repairs
            </TabsTrigger>
            <TabsTrigger value="activity">
              <History className="h-4 w-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Store tab */}
          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle>Items in store</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Per-item quantities. Use actions to assign to project, mark lost, or mark damaged.
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Store</TableHead>
                      <TableHead className="text-right">Damaged</TableHead>
                      <TableHead className="text-right">Lost</TableHead>
                      <TableHead className="text-right">Assigned</TableHead>
                      {(canEdit || canDelete) && <TableHead className="w-[120px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.storeQty}</TableCell>
                        <TableCell className="text-right">{item.damagedQty}</TableCell>
                        <TableCell className="text-right">{item.lostQty}</TableCell>
                        <TableCell className="text-right">{item.totalAssigned}</TableCell>
                        {(canEdit || canDelete) && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreHorizontal className="h-4 w-4 mr-1" />
                                  Actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover">
                                {canEdit && (
                                  <>
                                    <DropdownMenuItem onClick={() => openAssign(item)} disabled={item.storeQty <= 0}>
                                      Assign to project
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openMarkLost(item)} disabled={item.storeQty <= 0}>
                                      Mark lost
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openMarkDamaged(item)} disabled={item.storeQty <= 0}>
                                      Mark damaged
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {canDelete && (
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteItem(item)}>
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
          </TabsContent>

          {/* Project tab */}
          <TabsContent value="project">
            <div className="flex items-center gap-2 mb-4">
              <Label className="text-sm text-muted-foreground">Project</Label>
              <Select value={projectIdForProjectTab} onValueChange={(v) => setSelectedProjectId(v)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Assigned items</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Items assigned to {selectedProject?.name ?? 'selected project'}. Return to store or mark as lost/damaged.
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      {canEdit && <TableHead className="w-[120px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canEdit ? 3 : 2} className="text-center text-muted-foreground py-8">
                          No items assigned to this project.
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignedItems.map(({ item, assignment }) => (
                        <TableRow key={`${item.id}-${assignment.projectId}`}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right">{assignment.quantity}</TableCell>
                          {canEdit && (
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <MoreHorizontal className="h-4 w-4 mr-1" />
                                    Actions
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-popover">
                                  <DropdownMenuItem onClick={() => openReturn(item, assignment)}>
                                    Return to store
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openProjectMarkLost(item, assignment)}>
                                    Mark lost
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openProjectMarkDamaged(item, assignment)}>
                                    Mark damaged
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Repairs tab */}
          <TabsContent value="repairs">
            <Card>
              <CardHeader>
                <CardTitle>Items needing repair</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Items with damaged quantity &gt; 0. Repair to move back to store, or mark as lost if unrepairable.
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Damaged qty</TableHead>
                      {canEdit && <TableHead className="w-[180px]">Actions</TableHead>}
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
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => openRepair(item)}>
                                  Repair
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-popover">
                                    <DropdownMenuItem onClick={() => openMarkLostFromDamaged(item)}>
                                      Mark as lost (unrepairable)
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
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
          </TabsContent>

          {/* Activity tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>All actions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Assigning, returning, marking damaged/lost, and repairs.
                </p>
                <div className="flex gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Input
                      type="date"
                      value={activityDateFrom}
                      onChange={(e) => setActivityDateFrom(e.target.value)}
                      className="w-[140px]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Input
                      type="date"
                      value={activityDateTo}
                      onChange={(e) => setActivityDateTo(e.target.value)}
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
                      <TableHead>Action</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allMovements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No activity in selected range.
                        </TableCell>
                      </TableRow>
                    ) : (
                      allMovements.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(m.createdAt), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>{MOVEMENT_TYPE_LABELS[m.movementType] ?? m.movementType}</TableCell>
                          <TableCell>{m.nonConsumableItem?.name ?? m.nonConsumableItemId}</TableCell>
                          <TableCell className="text-right">{m.quantity}</TableCell>
                          <TableCell>{m.project?.name ?? '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={m.remarks ?? ''}>
                            {m.remarks ?? '-'}
                          </TableCell>
                          <TableCell>{m.createdBy?.name ?? '-'}</TableCell>
                          <TableCell className="text-right">
                            {m.cost != null && m.cost > 0 ? formatCurrency(m.cost) : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Store dialogs */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to project</DialogTitle>
            {selectedItem && (
              <p className="text-sm text-muted-foreground">
                {selectedItem.name} · Available in store: {selectedItem.storeQty}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min={0.01} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Combobox value={projectId} onValueChange={setProjectId} options={projectOptions} placeholder="Select project" searchPlaceholder="Search projects..." />
            </div>
            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" rows={2} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={submitAssign} disabled={submitting || !projectId || !quantity.trim()}>{submitting ? 'Saving...' : 'Assign'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as lost</DialogTitle>
            {selectedItem && <p className="text-sm text-muted-foreground">{selectedItem.name} · Available in store: {selectedItem.storeQty}</p>}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min={0.01} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g., Lost on site" rows={2} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostOpen(false)}>Cancel</Button>
            <Button onClick={submitMarkLost} disabled={submitting || !quantity.trim()}>{submitting ? 'Saving...' : 'Mark lost'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={damagedOpen} onOpenChange={setDamagedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as damaged</DialogTitle>
            {selectedItem && <p className="text-sm text-muted-foreground">{selectedItem.name} · Available in store: {selectedItem.storeQty}</p>}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min={0.01} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g., Damage description" rows={2} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDamagedOpen(false)}>Cancel</Button>
            <Button onClick={submitMarkDamaged} disabled={submitting || !quantity.trim()}>{submitting ? 'Saving...' : 'Mark damaged'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project dialogs */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to store</DialogTitle>
            {selectedAssignment && <p className="text-sm text-muted-foreground">{selectedAssignment.item.name} · Assigned: {selectedAssignment.quantity}</p>}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min={0.01} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" rows={2} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button onClick={submitReturn} disabled={submitting || !quantity.trim()}>{submitting ? 'Saving...' : 'Return to store'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={projectLostOpen} onOpenChange={setProjectLostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as lost</DialogTitle>
            {selectedAssignment && <p className="text-sm text-muted-foreground">{selectedAssignment.item.name} · Assigned: {selectedAssignment.quantity}</p>}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min={0.01} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g., Lost on site" rows={2} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectLostOpen(false)}>Cancel</Button>
            <Button onClick={submitProjectMarkLost} disabled={submitting || !quantity.trim()}>{submitting ? 'Saving...' : 'Mark lost'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={projectDamagedOpen} onOpenChange={setProjectDamagedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as damaged</DialogTitle>
            {selectedAssignment && <p className="text-sm text-muted-foreground">{selectedAssignment.item.name} · Assigned: {selectedAssignment.quantity}</p>}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min={0.01} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g., Damage description" rows={2} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDamagedOpen(false)}>Cancel</Button>
            <Button onClick={submitProjectMarkDamaged} disabled={submitting || !quantity.trim()}>{submitting ? 'Saving...' : 'Mark damaged'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Repairs dialogs */}
      <Dialog open={repairOpen} onOpenChange={setRepairOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repair damaged</DialogTitle>
            {selectedItem && <p className="text-sm text-muted-foreground">{selectedItem.name} · Damaged quantity: {selectedItem.damagedQty}</p>}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity to repair</Label>
              <Input type="number" min={0.01} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Repair cost (optional)</Label>
              <Input type="number" min={0} step="any" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
              <p className="text-xs text-muted-foreground">Recorded as expense for reporting</p>
            </div>
            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g., Parts replaced" rows={2} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepairOpen(false)}>Cancel</Button>
            <Button onClick={submitRepair} disabled={submitting || !quantity.trim()}>{submitting ? 'Saving...' : 'Record repair'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lostFromDamagedOpen} onOpenChange={setLostFromDamagedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as lost (unrepairable)</DialogTitle>
            {selectedItem && <p className="text-sm text-muted-foreground">{selectedItem.name} · Damaged quantity: {selectedItem.damagedQty}</p>}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity to mark as lost</Label>
              <Input type="number" min={0.01} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g., Unrepairable, disposed" rows={2} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostFromDamagedOpen(false)}>Cancel</Button>
            <Button onClick={submitMarkLostFromDamaged} disabled={submitting || !quantity.trim()}>{submitting ? 'Saving...' : 'Mark as lost'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InventoryDialog
        open={inventoryDialogOpen}
        onOpenChange={(open) => {
          setInventoryDialogOpen(open);
          if (!open) setSelectedForEdit(null);
        }}
        consumableItem={null}
        nonConsumableItem={selectedForEdit}
        initialTab="non-consumable"
        units={[]}
        onSaveConsumable={async () => {}}
        onSaveNonConsumable={handleSaveNonConsumable}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Item"
        description="Are you sure you want to delete this non-consumable item? This action cannot be undone."
        onConfirm={handleConfirmDelete}
      />
    </AppLayout>
  );
}
