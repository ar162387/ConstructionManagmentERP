import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Contractor } from '@/types';

interface ContractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractor?: Contractor | null;
  projectId: string | null;
  onSave: (data: Partial<Contractor> & { projectId?: string }) => void;
}

export function ContractorDialog({
  open,
  onOpenChange,
  contractor,
  projectId,
  onSave,
}: ContractorDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (open) {
      if (contractor) {
        setFormData({
          name: contractor.name,
          contactPerson: contractor.contactPerson ?? '',
          phone: contractor.phone ?? '',
          email: contractor.email ?? '',
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
  }, [open, contractor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: contractor?.id,
      projectId: contractor?.projectId ?? projectId ?? undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{contractor ? 'Edit Contractor' : 'Add Contractor'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Contractors are project-scoped. This contractor is tied to the selected project.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., ABC Contractors"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input
              id="contactPerson"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{contractor ? 'Save Changes' : 'Add Contractor'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
