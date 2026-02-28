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
import { createUser } from "@/services/usersService";
import { toast } from "sonner";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  currentUserRole: string;
  projects: { id: string; name: string }[];
}

const ROLES = [
  { value: "Super Admin", apiValue: "super_admin" },
  { value: "Admin", apiValue: "admin" },
  { value: "Site Manager", apiValue: "site_manager" },
];

export function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
  currentUserRole,
  projects,
}: CreateUserDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("site_manager");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);

  const allowedRoles =
    currentUserRole === "Super Admin"
      ? ROLES
      : ROLES.filter((r) => r.value === "Site Manager");

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("site_manager");
      setProjectId("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const project = role === "site_manager" ? projects.find((p) => p.id === projectId) : undefined;
      await createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: role,
        assignedProjectId: role === "site_manager" ? (projectId || undefined) : undefined,
        assignedProjectName: role === "site_manager" ? project?.name : undefined,
      });
      toast.success("User created");
      onCreated();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="User name"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@erp.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Password *</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                  <SelectItem key={r.value} value={r.apiValue}>
                    {r.value}
                  </SelectItem>
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
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="warning" disabled={loading}>
              {loading ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
