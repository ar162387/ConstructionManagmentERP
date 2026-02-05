import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  DollarSign,
  CreditCard,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCanEdit, useCanDelete } from '@/contexts/ProjectContext';
import * as vendorInvoiceService from '@/services/vendorInvoiceService';
import * as vendorService from '@/services/vendorService';
import * as consumableItemService from '@/services/consumableItemService';
import * as unitService from '@/services/unitService';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { format } from 'date-fns';
import { VendorInvoiceDialog, InvoiceLineForm } from '@/components/modals/VendorInvoiceDialog';
import { VendorInvoicePaymentDialog } from '@/components/modals/VendorInvoicePaymentDialog';
import {
  VendorInvoice,
  VendorInvoiceLineItem,
  VendorInvoicePayment,
} from '@/types';
import type { Vendor } from '@/types';
import type { ConsumableItem } from '@/types';
import type { Unit } from '@/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function VendorInvoices() {
  const { isAuthenticated } = useAuth();
  const canEdit = useCanEdit();
  const canDelete = useCanDelete();
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [consumables, setConsumables] = useState<ConsumableItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<
    (VendorInvoice & { lineItems?: VendorInvoiceLineItem[]; payments?: VendorInvoicePayment[] }) | null
  >(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'remaining'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      vendorInvoiceService.getVendorInvoices(),
      vendorService.getVendors(),
      consumableItemService.getConsumableItems(),
      unitService.getUnits(),
    ])
      .then(([invs, vends, items, u]) => {
        if (!cancelled) {
          setInvoices(invs);
          setVendors(vends);
          setConsumables(items);
          setUnits(u);
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

  const loadInvoices = () => {
    vendorInvoiceService.getVendorInvoices().then(setInvoices).catch(() => { });
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getUnitDisplay = (unitId: string) => {
    const u = units.find((x) => x.id === unitId);
    return u ? u.symbol : unitId;
  };

  const getItemName = (consumableItemId: string) => {
    const item = consumables.find((c) => c.id === consumableItemId);
    return item ? `${item.name} (${getUnitDisplay(item.unitId)})` : consumableItemId;
  };

  const filteredInvoices = selectedVendorId
    ? invoices.filter((i) => i.vendorId === selectedVendorId)
    : invoices;

  const displayedInvoices =
    paymentFilter === 'paid'
      ? filteredInvoices.filter((i) => i.remainingAmount === 0)
      : paymentFilter === 'remaining'
        ? filteredInvoices.filter((i) => i.remainingAmount > 0)
        : filteredInvoices;

  const kpiTotal = filteredInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const kpiPaid = filteredInvoices.reduce((s, i) => s + i.paidAmount, 0);
  const kpiRemaining = filteredInvoices.reduce((s, i) => s + i.remainingAmount, 0);

  const selectedVendor = selectedVendorId
    ? vendors.find((v) => v.id === selectedVendorId)
    : null;

  const vendorOptions = [
    { value: '', label: 'All Vendors' },
    ...vendors.map((v) => ({ value: v.id, label: v.name })),
  ];

  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setInvoiceDetail(null);
    setInvoiceDialogOpen(true);
  };

  const handleSaveInvoice = async (
    _invoice: Partial<VendorInvoice>,
    lines: InvoiceLineForm[],
    initialPaidAmount?: number
  ) => {
    try {
      if (_invoice.id) {
        await vendorInvoiceService.updateVendorInvoice(_invoice.id, {
          vehicleNumber: _invoice.vehicleNumber,
          biltyNumber: _invoice.biltyNumber,
          invoiceDate: new Date(_invoice.invoiceDate!).toISOString().split('T')[0],
          invoiceNumber: _invoice.invoiceNumber,
          lineItems: lines.map((l) => ({
            consumableItemId: l.consumableItemId,
            quantity: l.quantity,
            unitCost: l.unitCost,
          })),
        });
        toast({
          title: 'Invoice Updated',
          description: 'Vendor invoice has been updated. Inventory adjusted.',
        });
      } else {
        const created = await vendorInvoiceService.createVendorInvoice({
          vendorId: _invoice.vendorId!,
          vehicleNumber: _invoice.vehicleNumber,
          biltyNumber: _invoice.biltyNumber,
          invoiceDate: new Date(_invoice.invoiceDate!).toISOString().split('T')[0],
          invoiceNumber: _invoice.invoiceNumber,
          lineItems: lines.map((l) => ({
            consumableItemId: l.consumableItemId,
            quantity: l.quantity,
            unitCost: l.unitCost,
          })),
        });

        if (initialPaidAmount && initialPaidAmount > 0) {
          await vendorInvoiceService.recordPayment(created.id, {
            amount: initialPaidAmount,
            date: new Date(_invoice.invoiceDate!).toISOString().split('T')[0],
            paymentMode: 'cash',
            reference: 'Initial payment at invoice creation',
          });
        }

        toast({
          title: 'Invoice Created',
          description: initialPaidAmount && initialPaidAmount > 0
            ? `Vendor invoice created with initial payment of ${formatCurrency(initialPaidAmount)}. Inventory updated.`
            : 'Vendor invoice has been created. Inventory updated.',
        });
      }
      setInvoiceDialogOpen(false);
      loadInvoices();
      if (_invoice.id && invoiceDetail?.id === _invoice.id) {
        const full = await vendorInvoiceService.getVendorInvoice(_invoice.id);
        setInvoiceDetail(full);
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Failed to save invoice.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleEditInvoice = async (inv: VendorInvoice) => {
    setSelectedInvoice(inv);
    setDetailOpen(false);
    try {
      const full = await vendorInvoiceService.getVendorInvoice(inv.id);
      setInvoiceDetail(full);
      setInvoiceDialogOpen(true);
    } catch {
      toast({ title: 'Error', description: 'Failed to load invoice details.', variant: 'destructive' });
    }
  };

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;
    try {
      await vendorInvoiceService.deleteVendorInvoice(selectedInvoice.id);
      toast({
        title: 'Invoice Deleted',
        description: 'Vendor invoice has been deleted. Inventory reverted.',
      });
      setDeleteDialogOpen(false);
      setDetailOpen(false);
      setSelectedInvoice(null);
      setInvoiceDetail(null);
      loadInvoices();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Failed to delete invoice.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleViewDetail = async (inv: VendorInvoice) => {
    setSelectedInvoice(inv);
    setDetailOpen(true);
    try {
      const full = await vendorInvoiceService.getVendorInvoice(inv.id);
      setInvoiceDetail(full);
    } catch {
      setInvoiceDetail(null);
    }
  };

  const handleRecordPayment = (inv: VendorInvoice) => {
    setSelectedInvoice(inv);
    setDetailOpen(false);
    setPaymentDialogOpen(true);
  };

  const handleSavePayment = async (payment: Omit<VendorInvoicePayment, 'id'>) => {
    if (!selectedInvoice) return;
    try {
      await vendorInvoiceService.recordPayment(selectedInvoice.id, {
        amount: payment.amount,
        date: new Date(payment.date).toISOString().split('T')[0],
        paymentMode: payment.paymentMode,
        reference: payment.reference,
      });
      toast({
        title: 'Payment Recorded',
        description: `Payment of ${formatCurrency(payment.amount)} has been recorded.`,
      });
      setPaymentDialogOpen(false);
      setSelectedInvoice(null);
      loadInvoices();
      if (invoiceDetail?.id === selectedInvoice.id) {
        const full = await vendorInvoiceService.getVendorInvoice(selectedInvoice.id);
        setInvoiceDetail(full);
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Failed to record payment.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const lineItems = invoiceDetail?.lineItems ?? [];
  const payments = invoiceDetail?.payments ?? [];

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">Loading invoices...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vendor Invoices (Stock Addition)</h1>
            <p className="text-muted-foreground">
              Create vendor invoices to add stock. Select a vendor to filter invoices and KPIs.
            </p>
          </div>
          <Button className="w-fit" onClick={handleCreateInvoice}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full max-w-md">
            <Combobox
              value={selectedVendorId}
              onValueChange={setSelectedVendorId}
              options={vendorOptions}
              placeholder="Select vendor..."
              searchPlaceholder="Search vendors..."
              emptyMessage="No vendors found."
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className={cn(
              'cursor-pointer transition-colors hover:bg-muted/50',
              paymentFilter === 'all' && 'ring-2 ring-primary'
            )}
            onClick={() => setPaymentFilter('all')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpiTotal)}</div>
              <p className="text-xs text-muted-foreground">
                {selectedVendor ? `${selectedVendor.name} invoices` : 'All invoices'}
              </p>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'cursor-pointer transition-colors hover:bg-muted/50',
              paymentFilter === 'paid' && 'ring-2 ring-primary'
            )}
            onClick={() => setPaymentFilter('paid')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Paid
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(kpiPaid)}
              </div>
              <p className="text-xs text-muted-foreground">Fully settled only</p>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'cursor-pointer transition-colors hover:bg-muted/50',
              paymentFilter === 'remaining' && 'ring-2 ring-primary'
            )}
            onClick={() => setPaymentFilter('remaining')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Remaining
              </CardTitle>
              <DollarSign className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(kpiRemaining)}
              </div>
              <p className="text-xs text-muted-foreground">Pending dues only</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedVendor ? `${selectedVendor.name} – Invoices` : 'All Invoices'}
              {paymentFilter === 'paid' && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (Fully settled only)
                </span>
              )}
              {paymentFilter === 'remaining' && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (Pending dues only)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Bilty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedInvoices.map((inv) => {
                  const vendor = vendors.find((v) => v.id === inv.vendorId);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        {inv.invoiceNumber ?? inv.id}
                      </TableCell>
                      <TableCell>{format(inv.invoiceDate, 'MMM d, yyyy')}</TableCell>
                      <TableCell>{vendor?.name ?? inv.vendorId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{inv.vehicleNumber}</Badge>
                      </TableCell>
                      <TableCell>{inv.biltyNumber}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(inv.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(inv.paidAmount)}
                      </TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        {formatCurrency(inv.remainingAmount)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem onClick={() => handleViewDetail(inv)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View / Ledger
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRecordPayment(inv)}
                              disabled={inv.remainingAmount <= 0}
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Record Payment
                            </DropdownMenuItem>
                            {canEdit && (
                              <DropdownMenuItem onClick={() => handleEditInvoice(inv)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedInvoice(inv);
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <VendorInvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={(open) => {
          setInvoiceDialogOpen(open);
          if (!open) setSelectedInvoice(null);
        }}
        invoice={invoiceDetail ?? undefined}
        lineItems={invoiceDetail?.lineItems}
        vendors={vendors}
        consumables={consumables}
        units={units}
        onSave={handleSaveInvoice}
      />

      <VendorInvoicePaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={selectedInvoice}
        onSave={handleSavePayment}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the invoice and revert the stock added by it from inventory.
              Deletion is only allowed if enough stock remains (stock consumed since the invoice cannot be reverted).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteInvoice();
              }}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Invoice Detail</SheetTitle>
          </SheetHeader>
          {selectedInvoice && (
            <div className="space-y-6 mt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {selectedInvoice.invoiceNumber ?? selectedInvoice.id}
                </p>
                <p className="font-medium">
                  {vendors.find((v) => v.id === selectedInvoice.vendorId)?.name}
                </p>
                <p className="text-sm">
                  Vehicle: {selectedInvoice.vehicleNumber} | Bilty: {selectedInvoice.biltyNumber}
                </p>
                <p className="text-sm">
                  Date: {format(selectedInvoice.invoiceDate, 'MMM d, yyyy')}
                </p>
                <div className="flex gap-4 pt-2">
                  <span className="font-medium">Total: {formatCurrency(selectedInvoice.totalAmount)}</span>
                  <span className="text-green-600">Paid: {formatCurrency(selectedInvoice.paidAmount)}</span>
                  <span className="text-destructive font-medium">
                    Remaining: {formatCurrency(selectedInvoice.remainingAmount)}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Line Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((li) => (
                      <TableRow key={li.id}>
                        <TableCell>{getItemName(li.consumableItemId)}</TableCell>
                        <TableCell className="text-right">{li.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(li.unitCost)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(li.lineTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div>
                <h4 className="font-medium mb-2">Payment Ledger</h4>
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payments yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{format(p.date, 'MMM d, yyyy')}</TableCell>
                          <TableCell className="capitalize">
                            {p.paymentMode.replace('_', ' ')}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(p.amount)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {p.reference ?? '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => selectedInvoice && handleRecordPayment(selectedInvoice)}
                  disabled={selectedInvoice.remainingAmount <= 0}
                >
                  Record Payment
                </Button>
                {canEdit && (
                  <Button
                    variant="outline"
                    onClick={() => selectedInvoice && handleEditInvoice(selectedInvoice)}
                  >
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setDeleteDialogOpen(true);
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
