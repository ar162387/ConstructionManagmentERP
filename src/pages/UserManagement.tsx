import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { CreateUserDialog } from "@/components/dialogs/CreateUserDialog";
import { EditUserDialog, type EditableUser } from "@/components/dialogs/EditUserDialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { listUsers, createUser, updateUser, deleteUser, type ApiUser } from "@/services/usersService";
import { toast } from "sonner";

function canManageTarget(actorRole: string, targetRole: string): boolean {
  if (actorRole === "Super Admin") return true;
  if (actorRole === "Admin" && targetRole === "Site Manager") return true;
  return false;
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { projects } = useProjects();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const list = await listUsers();
      setUsers(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openEdit = (u: ApiUser) => {
    setSelectedUser(u);
    setEditOpen(true);
  };

  const openDelete = (u: ApiUser) => {
    setSelectedUser(u);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser(selectedUser.id);
      setDeleteOpen(false);
      setSelectedUser(null);
      fetchUsers();
      toast.success("User deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const actorRole = currentUser?.role ?? "Site Manager";
  const showCreate = actorRole === "Super Admin" || actorRole === "Admin";

  return (
    <Layout>
      <PageHeader
        title="User Management"
        subtitle="Create and manage users"
        printTargetId="users-table"
        actions={
          showCreate ? (
            <Button variant="warning" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create User
            </Button>
          ) : undefined
        }
      />
      <div id="users-table" className="border-2 border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Name</th>
                <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Email</th>
                <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Role</th>
                <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Assigned Project</th>
                <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider w-24 print-hidden">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const canManage = canManageTarget(actorRole, u.role);
                  return (
                    <tr key={u.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 font-bold">{u.name}</td>
                      <td className="px-4 py-3 text-sm font-mono">{u.email}</td>
                      <td className="px-4 py-3"><StatusBadge status={u.role} /></td>
                      <td className="px-4 py-3 text-sm">{u.assignedProjectName || "—"}</td>
                      <td className="px-4 py-3 print-hidden">
                        <div className="flex items-center justify-end gap-1">
                          {canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => openEdit(u)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => openDelete(u)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchUsers}
        currentUserRole={actorRole}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />

      <EditUserDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={selectedUser as EditableUser | null}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        allowedRoles={
          actorRole === "Super Admin"
            ? ["Super Admin", "Admin", "Site Manager"]
            : ["Site Manager"]
        }
        onSave={async (id, data) => {
          await updateUser(id, data);
          fetchUsers();
        }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
