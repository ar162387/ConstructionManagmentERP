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
  assignedProjectId?: string;
  assignedProjectName?: string;
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
      assignedProjectId?: string | null;
      assignedProjectName?: string | null;
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
  const [projectId, setProjectId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(ROLE_API_VALUES[user.role] ?? user.role);
      setProjectId(user.assignedProjectId ?? "");
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
    const project = role === "site_manager" ? projects.find((p) => p.id === projectId) : undefined;
    const assignedProjectId = role === "site_manager" ? (projectId || null) : undefined;
    const assignedProjectName = role === "site_manager" ? (project?.name ?? null) : undefined;
    setLoading(true);
    try {
      await onSave(user.id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        ...(role === "site_manager" && { assignedProjectId, assignedProjectName }),
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
              <Label>Assigned Project (optional)</Label>
              <Select
                value={projectId || "__none__"}
                onValueChange={(v) => setProjectId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
