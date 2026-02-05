import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, Shield, ShieldCheck, ShieldAlert, Pencil, Trash2, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
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
import { cn } from '@/lib/utils';
import { UserDialog, UserFormData } from '@/components/modals/UserDialog';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';
import { UserRole } from '@/types';
import { toast } from '@/hooks/use-toast';
import { getUsers, createUser, updateUser, deleteUser } from '@/services/userService';
import { getProjects } from '@/services/projectService';
import type { User } from '@/types';
import type { Project } from '@/types';

const roleIcons = {
  super_admin: ShieldCheck,
  admin: Shield,
  site_manager: ShieldAlert,
};

const roleBadgeStyles = {
  super_admin: 'bg-primary text-primary-foreground',
  admin: 'bg-secondary text-secondary-foreground',
  site_manager: 'bg-muted text-muted-foreground',
};

export default function UserManagement() {
  const { isAuthenticated, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserFormData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [usersData, projectsData] = await Promise.all([
          getUsers(),
          getProjects(),
        ]);
        setUsers(usersData);
        setProjects(projectsData);
      } catch (err) {
        toast({
          title: 'Failed to load users',
          description: 'Could not fetch user list. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'super_admin' && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'site_manager':
        return 'Site Manager';
      default:
        return role;
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      !searchQuery.trim() ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = () => {
    setSelectedUser(null);
    setUserDialogOpen(true);
  };

  const handleEditUser = (userItem: User) => {
    setSelectedUser({
      id: userItem.id,
      name: userItem.name,
      email: userItem.email,
      role: userItem.role,
      canEdit: userItem.role === 'admin' ? (userItem.canEdit ?? true) : false,
      canDelete: userItem.role === 'admin' ? (userItem.canDelete ?? true) : false,
      assignedProjects: userItem.assignedProjects ?? [],
    });
    setUserDialogOpen(true);
  };

  const handleSaveUser = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      if (data.id) {
        await updateUser(data.id, {
          name: data.name,
          email: data.email,
          password: data.password || undefined,
          role: data.role,
          canEdit: data.canEdit,
          canDelete: data.canDelete,
          assignedProjects: data.assignedProjects,
        });
        toast({
          title: 'User Updated',
          description: `${data.name} has been updated successfully.`,
        });
      } else {
        if (!data.password || data.password.length < 8) {
          toast({
            title: 'Validation Error',
            description: 'Password must be at least 8 characters.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
        await createUser({
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          canEdit: data.canEdit,
          canDelete: data.canDelete,
          assignedProjects: data.assignedProjects,
        });
        toast({
          title: 'User Added',
          description: `${data.name} has been added successfully.`,
        });
      }
      setUserDialogOpen(false);
      const refreshed = await getUsers();
      setUsers(refreshed);
    } catch (err: unknown) {
      let message = 'An error occurred.';
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response;
        const data = res?.data;
        if (data?.message) message = data.message;
        else if (data?.errors && typeof data.errors === 'object')
          message = Object.values(data.errors).flat().join(' ');
      }
      toast({
        title: data.id ? 'Update Failed' : 'Create Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePermission = async (
    targetUser: User,
    field: 'canEdit' | 'canDelete',
    value: boolean
  ) => {
    if (targetUser.role !== 'admin') return;
    if (user?.role !== 'super_admin') return;
    try {
      await updateUser(targetUser.id, { [field]: value });
      toast({
        title: 'Permission Updated',
        description: `${targetUser.name}'s ${field === 'canEdit' ? 'edit' : 'delete'} permission has been ${value ? 'enabled' : 'disabled'}.`,
      });
      const refreshed = await getUsers();
      setUsers(refreshed);
    } catch {
      toast({
        title: 'Update Failed',
        description: 'Could not update permission. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteUser(userToDelete.id);
      toast({
        title: 'User Deleted',
        description: 'The user has been removed successfully.',
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      const refreshed = await getUsers();
      setUsers(refreshed);
    } catch {
      toast({
        title: 'Delete Failed',
        description: 'Could not delete the user. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const userWithExtras = (u: User) => ({
    ...u,
    canEdit: u.canEdit ?? (u.role !== 'site_manager'),
    canDelete: u.canDelete ?? (u.role !== 'site_manager'),
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <Button className="w-fit" onClick={handleAddUser}>
            <Plus className="mr-2 h-4 w-4" />
            {user?.role === 'admin' ? 'Add Site Manager' : 'Add User'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Super Admins
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.role === 'super_admin').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Admins
              </CardTitle>
              <Shield className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.role === 'admin').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Site Managers
              </CardTitle>
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.role === 'site_manager').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned Projects</TableHead>
                    <TableHead className="text-center">Can Edit</TableHead>
                    <TableHead className="text-center">Can Delete</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((userItem) => {
                    const u = userWithExtras(userItem);
                    const RoleIcon = roleIcons[userItem.role as keyof typeof roleIcons];
                    return (
                      <TableRow key={userItem.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={userItem.avatar} alt={userItem.name} />
                              <AvatarFallback>
                                {userItem.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{userItem.name}</p>
                              <p className="text-sm text-muted-foreground">{userItem.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              'gap-1',
                              roleBadgeStyles[userItem.role as keyof typeof roleBadgeStyles]
                            )}
                          >
                            <RoleIcon className="h-3 w-3" />
                            {getRoleLabel(userItem.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px]">
                          {userItem.role === 'site_manager' && userItem.assignedProjects?.length
                            ? projects
                              .filter((p) => userItem.assignedProjects?.includes(p.id))
                              .map((p) => p.name)
                              .join(', ')
                            : userItem.role === 'site_manager'
                              ? 'None'
                              : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          {userItem.role === 'site_manager' ? (
                            <span className="text-muted-foreground">—</span>
                          ) : userItem.role === 'super_admin' ? (
                            <span className="text-muted-foreground text-xs">Full access</span>
                          ) : (
                            <Switch
                              checked={u.canEdit}
                              disabled={user?.role !== 'super_admin'}
                              onCheckedChange={(checked) =>
                                handleTogglePermission(userItem, 'canEdit', checked)
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {userItem.role === 'site_manager' ? (
                            <span className="text-muted-foreground">—</span>
                          ) : userItem.role === 'super_admin' ? (
                            <span className="text-muted-foreground text-xs">Full access</span>
                          ) : (
                            <Switch
                              checked={u.canDelete}
                              disabled={user?.role !== 'super_admin'}
                              onCheckedChange={(checked) =>
                                handleTogglePermission(userItem, 'canDelete', checked)
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {user?.role === 'super_admin' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover">
                                <DropdownMenuItem onClick={() => handleEditUser(userItem)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setUserToDelete(userItem);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {!isLoading && filteredUsers.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                {users.length === 0 ? 'No users found.' : 'No users match your search.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <UserDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        user={selectedUser}
        projects={projects}
        isSuperAdmin={user?.role === 'super_admin'}
        adminCanOnlyCreateSiteManager={user?.role === 'admin'}
        onSave={handleSaveUser}
        isSubmitting={isSubmitting}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setUserToDelete(null);
        }}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone."
        onConfirm={handleDeleteUser}
      />
    </AppLayout>
  );
}
