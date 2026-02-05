import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Search, Truck, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCanEdit, useCanDelete } from '@/contexts/ProjectContext';
import * as vendorService from '@/services/vendorService';
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
import { VendorDialog } from '@/components/modals/VendorDialog';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';
import { Vendor } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function Vendors() {
  const { isAuthenticated } = useAuth();
  const canEdit = useCanEdit();
  const canDelete = useCanDelete();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    vendorService.getVendors().then((data) => {
      if (!cancelled) setVendors(data);
    }).catch(() => {
      if (!cancelled) toast({ title: 'Error', description: 'Failed to load vendors.', variant: 'destructive' });
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

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

  const totalOutstanding = vendors.reduce(
    (sum, v) => sum + (v.outstanding ?? 0),
    0
  );
  const totalBilled = vendors.reduce(
    (sum, v) => sum + (v.totalBilled ?? 0),
    0
  );
  const totalPaid = vendors.reduce(
    (sum, v) => sum + (v.totalPaid ?? 0),
    0
  );

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.contactPerson ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddVendor = () => {
    setSelectedVendor(null);
    setVendorDialogOpen(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setVendorDialogOpen(true);
  };

  const handleSaveVendor = async (data: Partial<Vendor>) => {
    try {
      if (selectedVendor?.id) {
        await vendorService.updateVendor(selectedVendor.id, {
          name: data.name,
          contactPerson: data.contactPerson,
          phone: data.phone,
          email: data.email,
        });
        toast({
          title: 'Vendor Updated',
          description: `${data.name} has been updated successfully.`,
        });
      } else {
        await vendorService.createVendor({
          name: data.name!,
          contactPerson: data.contactPerson,
          phone: data.phone,
          email: data.email,
        });
        toast({
          title: 'Vendor Added',
          description: `${data.name} has been added successfully.`,
        });
      }
      setVendorDialogOpen(false);
      const list = await vendorService.getVendors();
      setVendors(list);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Failed to save vendor.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleDeleteVendor = async () => {
    if (!selectedVendor) return;
    try {
      await vendorService.deleteVendor(selectedVendor.id);
      toast({
        title: 'Vendor Deleted',
        description: 'The vendor has been deleted successfully.',
      });
      setDeleteDialogOpen(false);
      setSelectedVendor(null);
      const list = await vendorService.getVendors();
      setVendors(list);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Failed to delete vendor.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">Loading vendors...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vendors (Suppliers)</h1>
            <p className="text-muted-foreground">
              Company-scoped material suppliers. Use Vendor Invoices for stock addition.
            </p>
          </div>
          <Button className="w-fit" onClick={handleAddVendor}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Vendors
              </CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vendors.length}</div>
              <p className="text-xs text-muted-foreground">Company suppliers</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Billed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalBilled)}</div>
              <p className="text-xs text-muted-foreground">From invoices</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(totalOutstanding)}
              </div>
              <p className="text-xs text-muted-foreground">Pending payments</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search vendors by name, contact, or email..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vendors</CardTitle>
            <p className="text-sm text-muted-foreground">
              {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''} found
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Total Billed</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  {(canEdit || canDelete) && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                          <Truck className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{vendor.name}</div>
                          <div className="text-xs text-muted-foreground">Supplier</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{vendor.contactPerson}</TableCell>
                    <TableCell className="text-muted-foreground">{vendor.phone}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {vendor.email}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(vendor.totalBilled ?? 0)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(vendor.totalPaid ?? 0)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${(vendor.outstanding ?? 0) > 0 ? 'text-destructive' : ''
                        }`}
                    >
                      {formatCurrency(vendor.outstanding ?? 0)}
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
                              <DropdownMenuItem onClick={() => handleEditVendor(vendor)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Vendor
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedVendor(vendor);
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <VendorDialog
        open={vendorDialogOpen}
        onOpenChange={setVendorDialogOpen}
        vendor={selectedVendor}
        onSave={handleSaveVendor}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Vendor"
        description="Are you sure you want to delete this vendor? All invoice history will be lost."
        onConfirm={handleDeleteVendor}
      />
    </AppLayout>
  );
}
