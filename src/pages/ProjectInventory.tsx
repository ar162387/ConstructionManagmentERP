import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Package, ArrowLeftCircle, AlertTriangle, XCircle, MoreHorizontal } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProject, useCanEdit } from '@/contexts/ProjectContext';
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
import type { NonConsumableItem, NonConsumableProjectAssignment } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function ProjectInventory() {
  const { isAuthenticated } = useAuth();
  const { availableProjects, selectedProjectId, setSelectedProjectId } = useProject();
  const canEdit = useCanEdit();
  const [items, setItems] = useState<NonConsumableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnOpen, setReturnOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [damagedOpen, setDamagedOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<{
    item: NonConsumableItem;
    projectId: string;
    quantity: number;
  } | null>(null);
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    nonConsumableItemService
      .getNonConsumableItems()
      .then(setItems)
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

  const projectId = selectedProjectId ?? availableProjects[0]?.id ?? '';
  const assignedItems = items.flatMap((item) =>
    (item.assignments ?? [])
      .filter((a) => a.projectId === projectId && a.quantity > 0)
      .map((a) => ({ item, assignment: a }))
  );

  const openReturn = (item: NonConsumableItem, assignment: NonConsumableProjectAssignment) => {
    setSelectedAssignment({
      item,
      projectId: assignment.projectId,
      quantity: assignment.quantity,
    });
    setQuantity('');
    setRemarks('');
    setReturnOpen(true);
  };
  const openMarkLost = (item: NonConsumableItem, assignment: NonConsumableProjectAssignment) => {
    setSelectedAssignment({
      item,
      projectId: assignment.projectId,
      quantity: assignment.quantity,
    });
    setQuantity('');
    setRemarks('');
    setLostOpen(true);
  };
  const openMarkDamaged = (item: NonConsumableItem, assignment: NonConsumableProjectAssignment) => {
    setSelectedAssignment({
      item,
      projectId: assignment.projectId,
      quantity: assignment.quantity,
    });
    setQuantity('');
    setRemarks('');
    setDamagedOpen(true);
  };

  const submitReturn = async () => {
    if (!selectedAssignment) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0 || qty > selectedAssignment.quantity) {
      toast({
        title: 'Invalid quantity',
        description: `Enter a quantity between 1 and ${selectedAssignment.quantity}.`,
        variant: 'destructive',
      });
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
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to return.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitMarkLost = async () => {
    if (!selectedAssignment) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0 || qty > selectedAssignment.quantity) {
      toast({
        title: 'Invalid quantity',
        description: `Enter a quantity between 1 and ${selectedAssignment.quantity}.`,
        variant: 'destructive',
      });
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
      setLostOpen(false);
      setSelectedAssignment(null);
      loadData();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to mark lost.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitMarkDamaged = async () => {
    if (!selectedAssignment) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0 || qty > selectedAssignment.quantity) {
      toast({
        title: 'Invalid quantity',
        description: `Enter a quantity between 1 and ${selectedAssignment.quantity}.`,
        variant: 'destructive',
      });
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
      setDamagedOpen(false);
      setSelectedAssignment(null);
      loadData();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to mark damaged.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProject = availableProjects.find((p) => p.id === projectId);
  const totalAssigned = assignedItems.reduce((sum, { assignment }) => sum + assignment.quantity, 0);

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
            <h1 className="text-2xl font-bold tracking-tight">Project Inventory</h1>
            <p className="text-muted-foreground">
              Non-consumable items assigned to projects. Return to store or mark as lost/damaged.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Project</Label>
            <Select
              value={projectId}
              onValueChange={(v) => setSelectedProjectId(v)}
            >
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
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total assigned to {selectedProject?.name ?? 'project'}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssigned}</div>
            <p className="text-xs text-muted-foreground">Sum of quantities assigned to this project</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned items</CardTitle>
            <p className="text-sm text-muted-foreground">
              Items assigned to the selected project. Use actions to return, mark lost, or mark damaged.
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
                              <DropdownMenuItem onClick={() => openMarkLost(item, assignment)}>
                                Mark lost
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openMarkDamaged(item, assignment)}>
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
      </div>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to store</DialogTitle>
            {selectedAssignment && (
              <p className="text-sm text-muted-foreground">
                {selectedAssignment.item.name} · Assigned: {selectedAssignment.quantity}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
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
              <Label>Remarks (optional)</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional"
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitReturn} disabled={submitting || !quantity.trim()}>
              {submitting ? 'Saving...' : 'Return to store'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as lost</DialogTitle>
            {selectedAssignment && (
              <p className="text-sm text-muted-foreground">
                {selectedAssignment.item.name} · Assigned: {selectedAssignment.quantity}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
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
              <Label>Remarks (optional)</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g., Lost on site"
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitMarkLost} disabled={submitting || !quantity.trim()}>
              {submitting ? 'Saving...' : 'Mark lost'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={damagedOpen} onOpenChange={setDamagedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as damaged</DialogTitle>
            {selectedAssignment && (
              <p className="text-sm text-muted-foreground">
                {selectedAssignment.item.name} · Assigned: {selectedAssignment.quantity}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
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
              <Label>Remarks (optional)</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g., Damage description"
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDamagedOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitMarkDamaged} disabled={submitting || !quantity.trim()}>
              {submitting ? 'Saving...' : 'Mark damaged'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
