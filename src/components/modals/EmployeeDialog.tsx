import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { Employee } from '@/types';

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  onSave: (data: Partial<Employee>) => void;
}

export function EmployeeDialog({ open, onOpenChange, employee, onSave }: EmployeeDialogProps) {
  const { availableProjects } = useProject();
  const [formData, setFormData] = useState({
    projectId: employee?.projectId || '',
    name: employee?.name || '',
    role: employee?.role || '',
    payType: employee?.payType || 'monthly' as const,
    payRate: employee?.payRate || 0,
    phone: employee?.phone || '',
    joiningDate: employee?.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : '',
    assets: employee?.assets || [] as string[],
  });
  const [newAsset, setNewAsset] = useState('');

  const handleAddAsset = () => {
    if (newAsset.trim() && !formData.assets.includes(newAsset.trim())) {
      setFormData({ ...formData, assets: [...formData.assets, newAsset.trim()] });
      setNewAsset('');
    }
  };

  const handleRemoveAsset = (asset: string) => {
    setFormData({ ...formData, assets: formData.assets.filter((a) => a !== asset) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      joiningDate: new Date(formData.joiningDate),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{employee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project">Assign to Project</Label>
            <Select value={formData.projectId} onValueChange={(value) => setFormData({ ...formData, projectId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {availableProjects.map((proj) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., John Martinez"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Job Role</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="e.g., Site Supervisor"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payType">Pay Type</Label>
              <Select value={formData.payType} onValueChange={(value: 'monthly' | 'weekly' | 'daily' | 'hourly') => setFormData({ ...formData, payType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payRate">Pay Rate ($)</Label>
              <Input
                id="payRate"
                type="number"
                value={formData.payRate}
                onChange={(e) => setFormData({ ...formData, payRate: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +1 555-0101"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="joiningDate">Joining Date</Label>
              <Input
                id="joiningDate"
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assigned Assets</Label>
            <div className="flex gap-2">
              <Input
                value={newAsset}
                onChange={(e) => setNewAsset(e.target.value)}
                placeholder="e.g., Company Phone"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAsset())}
              />
              <Button type="button" variant="outline" onClick={handleAddAsset}>
                Add
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap mt-2">
              {formData.assets.map((asset) => (
                <Badge key={asset} variant="secondary" className="gap-1">
                  {asset}
                  <button type="button" onClick={() => handleRemoveAsset(asset)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{employee ? 'Save Changes' : 'Add Employee'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
