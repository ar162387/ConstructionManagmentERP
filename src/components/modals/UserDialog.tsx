import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { UserRole, Project } from '@/types';

export interface UserFormData {
  id?: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  canEdit: boolean;
  canDelete: boolean;
  assignedProjects: string[];
}

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserFormData | null;
  projects: Project[];
  isSuperAdmin: boolean;
  /** When true (admin creating user), role is locked to site_manager */
  adminCanOnlyCreateSiteManager?: boolean;
  onSave: (data: UserFormData) => void;
  isSubmitting?: boolean;
}

export function UserDialog({ open, onOpenChange, user, projects, isSuperAdmin, adminCanOnlyCreateSiteManager, onSave, isSubmitting }: UserDialogProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'site_manager',
    canEdit: false,
    canDelete: false,
    assignedProjects: [],
  });

  useEffect(() => {
    if (open) {
      const role = adminCanOnlyCreateSiteManager && !user?.id ? 'site_manager' : (user?.role || 'site_manager');
      setFormData({
        id: user?.id,
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        role,
        canEdit: user?.canEdit ?? false,
        canDelete: user?.canDelete ?? false,
        assignedProjects: user?.assignedProjects ?? [],
      });
    }
  }, [open, user, adminCanOnlyCreateSiteManager]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const setAssignedProject = (projectId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedProjects: projectId ? [projectId] : [],
    }));
  };

  const isEdit = !!user?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit User' : adminCanOnlyCreateSiteManager ? 'Add Site Manager' : 'Add New User'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Site Managers can only view and interact with their assigned projects.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., John Smith"
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
              placeholder="e.g., john@company.com"
              required
              disabled={isEdit}
            />
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                Email cannot be changed after creation.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              Password {isEdit ? '(leave blank to keep current)' : '*'}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={isEdit ? '••••••••' : 'Enter password'}
              required={!isEdit}
              minLength={8}
            />
            {!isEdit && (
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters.
              </p>
            )}
          </div>
          {!(adminCanOnlyCreateSiteManager && !user?.id) ? (
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="site_manager">Site Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {formData.role === 'site_manager' && (
            <div className="space-y-2">
              <Label>Assigned Project</Label>
              <p className="text-xs text-muted-foreground">
                Site managers can only be assigned one project.
              </p>
              <Select
                value={formData.assignedProjects[0] || 'unassigned'}
                onValueChange={(val) => setAssignedProject(val === 'unassigned' ? '' : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="unassigned">None (Revoke Assignment)</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isSuperAdmin && formData.role === 'admin' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="canEdit">Can Edit Records</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow editing existing data
                  </p>
                </div>
                <Switch
                  id="canEdit"
                  checked={formData.canEdit}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, canEdit: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="canDelete">Can Delete Records</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow deleting data
                  </p>
                </div>
                <Switch
                  id="canDelete"
                  checked={formData.canDelete}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, canDelete: checked })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
