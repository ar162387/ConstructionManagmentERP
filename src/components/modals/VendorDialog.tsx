import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Vendor } from '@/types';

interface VendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor | null;
  onSave: (data: Partial<Vendor>) => void;
}

export function VendorDialog({ open, onOpenChange, vendor, onSave }: VendorDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (open) {
      if (vendor) {
        setFormData({
          name: vendor.name,
          contactPerson: vendor.contactPerson,
          phone: vendor.phone,
          email: vendor.email,
        });
      } else {
        setFormData({
          name: '',
          contactPerson: '',
          phone: '',
          email: '',
        });
      }
    }
  }, [open, vendor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: vendor?.id,
      totalBilled: vendor?.totalBilled,
      totalPaid: vendor?.totalPaid,
      outstanding: vendor?.outstanding,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{vendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Vendors are company-scoped. Add material suppliers for stock addition (invoices).
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., BuildRight Materials"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input
              id="contactPerson"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              placeholder="e.g., Robert Smith"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +1 555-0201"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., orders@company.com"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{vendor ? 'Save Changes' : 'Add Vendor'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
