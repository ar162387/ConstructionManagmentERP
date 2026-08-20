import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export interface EditableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedProjectIds?: string[];
  assignedProjectNames?: string[];
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: EditableUser | null;
  projects: { id: string; name: string }[];
  allowedRoles: string[];
  onSave: (
    id: string,
    data: {
      name: string;
      email: string;
      role: string;
      assignedProjectIds?: string[] | null;
      assignedProjectNames?: string[] | null;
      password?: string;
    }
  ) => Promise<void>;
}

const ROLE_API_VALUES: Record<string, string> = {
  "Super Admin": "super_admin",
  Admin: "admin",
  "Site Manager": "site_manager",
};

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  projects,
  allowedRoles,
  onSave,
}: EditUserDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("site_manager");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleProject = (id: string) => {
    setProjectIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(ROLE_API_VALUES[user.role] ?? user.role);
      setProjectIds(user.assignedProjectIds ?? []);
      setNewPassword("");
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    const selectedProjects = role === "site_manager" ? projects.filter((p) => projectIds.includes(p.id)) : [];
    const assignedProjectIds = role === "site_manager" ? selectedProjects.map((p) => p.id) : undefined;
    const assignedProjectNames = role === "site_manager" ? selectedProjects.map((p) => p.name) : undefined;
    setLoading(true);
    try {
      await onSave(user.id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        ...(role === "site_manager" && { assignedProjectIds, assignedProjectNames }),
        ...(newPassword && { password: newPassword }),
      });
      toast.success("User updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="User name" className="mt-1" />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@erp.com" className="mt-1" />
          </div>
          <div>
            <Label>New Password (leave empty to keep current)</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedRoles.map((r) => (
                  <SelectItem key={r} value={ROLE_API_VALUES[r] ?? r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {role === "site_manager" && (
            <div>
              <Label>Assigned Projects (optional, select any number)</Label>
              <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-input p-2 space-y-1.5">
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-1 py-1">No projects available</p>
                ) : (
                  projects.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 px-1 py-1 text-sm cursor-pointer hover:bg-accent rounded-sm">
                      <Checkbox checked={projectIds.includes(p.id)} onCheckedChange={() => toggleProject(p.id)} />
                      {p.name}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
