import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Project } from '@/types';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSave: (data: Partial<Project>) => void;
  isSubmitting?: boolean;
}

export function ProjectDialog({ open, onOpenChange, project, onSave, isSubmitting }: ProjectDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'completed' | 'on_hold',
    budget: 0,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: project?.name || '',
        description: project?.description || '',
        status: project?.status || 'active',
        budget: project?.budget ?? 0,
        startDate: project?.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
        endDate: project?.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
      });
    }
  }, [open, project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: formData.name,
      description: formData.description,
      status: formData.status,
      budget: formData.budget,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
    });
  };

  const isEdit = !!project?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Allocated budget is a planning estimate. Utilized budget is computed from expenses and cannot be edited.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Skyline Tower Construction"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Project details and scope..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Allocated Budget *</Label>
              <Input
                id="budget"
                type="number"
                min={0}
                step={0.01}
                value={formData.budget || ''}
                onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                required
              />
              <p className="text-xs text-muted-foreground">Planning estimate only</p>
            </div>
            {isEdit && (
              <div className="space-y-2">
                <Label>Utilized Budget</Label>
                <Input
                  type="text"
                  value={project ? `Rs ${project.spent.toLocaleString()}` : ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Read-only, computed from expenses</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: 'active' | 'completed' | 'on_hold') => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date (optional)</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
