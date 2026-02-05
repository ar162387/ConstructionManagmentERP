import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Search, HardHat, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProject, useCanEdit, useCanDelete } from '@/contexts/ProjectContext';
import * as contractorService from '@/services/contractorService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ContractorDialog } from '@/components/modals/ContractorDialog';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';
import { Contractor } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function Contractors() {
  const { isAuthenticated } = useAuth();
  const {
    selectedProjectId,
    setSelectedProjectId,
    availableProjects,
    isLoading: projectsLoading,
  } = useProject();
  const canEdit = useCanEdit();
  const canDelete = useCanDelete();
  /** Effective project: context selection or first available (site manager sees scoped project; admin can choose). */
  const effectiveProjectId = selectedProjectId ?? availableProjects[0]?.id ?? null;

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractorDialogOpen, setContractorDialogOpen] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!effectiveProjectId) {
      setContractors([]);
      setLoading(false);
      return () => { cancelled = true; };
    }
    setLoading(true);
    contractorService
      .getContractors(effectiveProjectId)
      .then((data) => {
        if (!cancelled) setContractors(data);
      })
      .catch(() => {
        if (!cancelled)
          toast({
            title: 'Error',
            description: 'Failed to load contractors.',
            variant: 'destructive',
          });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveProjectId]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const filteredContractors = contractors.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contactPerson ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddContractor = () => {
    setSelectedContractor(null);
    setContractorDialogOpen(true);
  };

  const handleEditContractor = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setContractorDialogOpen(true);
  };

  const handleSaveContractor = async (
    data: Partial<Contractor> & { projectId?: string }
  ) => {
    const projectId = effectiveProjectId ?? data.projectId;
    if (!projectId) {
      toast({
        title: 'Error',
        description: 'Select a project first.',
        variant: 'destructive',
      });
      return;
    }
    try {
      if (selectedContractor?.id) {
        await contractorService.updateContractor(selectedContractor.id, {
          name: data.name,
          contactPerson: data.contactPerson,
          phone: data.phone,
          email: data.email,
        });
        toast({
          title: 'Contractor Updated',
          description: `${data.name} has been updated successfully.`,
        });
      } else {
        await contractorService.createContractor(projectId, {
          name: data.name!,
          contactPerson: data.contactPerson,
          phone: data.phone,
          email: data.email,
        });
        toast({
          title: 'Contractor Added',
          description: `${data.name} has been added successfully.`,
        });
      }
      setContractorDialogOpen(false);
      const list = await contractorService.getContractors(projectId);
      setContractors(list);
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message ===
          'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to save contractor.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleDeleteContractor = async () => {
    if (!selectedContractor) return;
    try {
      await contractorService.deleteContractor(selectedContractor.id);
      toast({
        title: 'Contractor Deleted',
        description: 'The contractor has been deleted successfully.',
      });
      setDeleteDialogOpen(false);
      setSelectedContractor(null);
      if (effectiveProjectId) {
        const list = await contractorService.getContractors(effectiveProjectId);
        setContractors(list);
      }
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response: { data?: { message?: string } } }).response?.data?.message ===
          'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to delete contractor.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  if (projectsLoading && availableProjects.length === 0) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </AppLayout>
    );
  }

  if (!effectiveProjectId) {
    return (
      <AppLayout>
        <div className="p-6">
          <p className="text-muted-foreground">
            No projects available. You need access to at least one project to manage contractors.
          </p>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">Loading contractors...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contractors</h1>
            <p className="text-muted-foreground">
              Project-scoped contractors. Manage billing in Contractor Billing.
            </p>
          </div>
          <Button className="w-fit" onClick={handleAddContractor}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contractor
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Project</span>
          <Select
            value={effectiveProjectId ?? ''}
            onValueChange={(value) => setSelectedProjectId(value)}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {availableProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search contractors by name, contact, or email..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contractors</CardTitle>
            <p className="text-sm text-muted-foreground">
              {filteredContractors.length} contractor
              {filteredContractors.length !== 1 ? 's' : ''} in this project
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  {(canEdit || canDelete) && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContractors.map((contractor) => (
                  <TableRow key={contractor.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                          <HardHat className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{contractor.name}</div>
                          <div className="text-xs text-muted-foreground">Contractor</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{contractor.contactPerson || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {contractor.phone || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {contractor.email || '—'}
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            {canEdit && (
                              <DropdownMenuItem
                                onClick={() => handleEditContractor(contractor)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedContractor(contractor);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ContractorDialog
        open={contractorDialogOpen}
        onOpenChange={setContractorDialogOpen}
        contractor={selectedContractor}
        projectId={effectiveProjectId}
        onSave={handleSaveContractor}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Contractor"
        description="Are you sure you want to delete this contractor? This cannot be undone if they have no billing or payment records."
        onConfirm={handleDeleteContractor}
      />
    </AppLayout>
  );
}
