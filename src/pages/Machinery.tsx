import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { useAuth } from "@/context/AuthContext";
import { useSelectedProject } from "@/context/SelectedProjectContext";
import { useProjects } from "@/hooks/useProjects";
import { useMachines } from "@/hooks/useMachines";
import { AddMachineDialog } from "@/components/dialogs/AddMachineDialog";
import { EditMachineDialog } from "@/components/dialogs/EditMachineDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TablePagination } from "@/components/TablePagination";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMachine } from "@/services/machinesService";
import type { ApiMachineWithTotals } from "@/services/machinesService";

const DEFAULT_PAGE_SIZE = 12;
const PAGE_SIZE_OPTIONS = [12, 24, 50, 100];

export default function Machinery() {
  const { user: currentUser } = useAuth();
  const { projects } = useProjects();
  const { selectedProjectId, setSelectedProjectId } = useSelectedProject();
  const [addOpen, setAddOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const isSiteManager = currentUser?.role === "Site Manager";
  const canEditDelete = !isSiteManager;

  const effectiveProjectId = isSiteManager ? (currentUser?.assignedProjectId ?? null) : (selectedProjectId || null);

  const { machines, total, loading, error, refetch } = useMachines(
    effectiveProjectId,
    page,
    pageSize
  );

  const [editMachine, setEditMachine] = useState<ApiMachineWithTotals | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteMachineState, setDeleteMachineState] = useState<ApiMachineWithTotals | null>(null);

  const projectsForSelector = useMemo(
    () => projects.filter((p) => p.status === "Active" || p.status === "On Hold"),
    [projects]
  );

  const subtitle =
    isSiteManager && currentUser?.assignedProjectName
      ? `Company owned & rented machinery — ${currentUser.assignedProjectName}`
      : effectiveProjectId
        ? `Company owned & rented machinery — ${projects.find((p) => p.id === effectiveProjectId)?.name ?? "Project"}`
        : "Company owned & rented machinery — Select project";

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndexOneBased = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  const canAdd = !!effectiveProjectId;

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const handleSuccess = () => {
    refetch();
  };

  const handleDeleteClick = (m: ApiMachineWithTotals) => {
    setDeleteMachineState(m);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteMachineState) return;
    try {
      await deleteMachine(deleteMachineState.id);
      toast.success("Machine deleted");
      setDeleteMachineState(null);
      handleSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete machine");
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Machinery"
        subtitle={subtitle}
        printTargetId="machinery-table"
        actions={
          <Button variant="warning" size="sm" onClick={() => setAddOpen(true)} disabled={!canAdd}>
            <Plus className="h-4 w-4 mr-1" />Add Machine
          </Button>
        }
      />
      <AddMachineDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        restrictedProjectId={isSiteManager ? currentUser?.assignedProjectId : undefined}
        restrictedProjectName={isSiteManager ? currentUser?.assignedProjectName : undefined}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        onSuccess={handleSuccess}
      />
      <EditMachineDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        machine={editMachine}
        onSave={handleSuccess}
      />
      <AlertDialog open={!!deleteMachineState} onOpenChange={(open) => !open && setDeleteMachineState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete machine?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteMachineState?.name}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-wrap items-end gap-4 p-4 border-2 border-border mb-4 print-hidden">
        {!isSiteManager && (
          <div className="min-w-[200px]">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project</Label>
            <Select value={selectedProjectId || ""} onValueChange={(v) => { setSelectedProjectId(v); setPage(1); }}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projectsForSelector.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Group machinery by project</p>
          </div>
        )}
        {isSiteManager && currentUser?.assignedProjectName && (
          <div className="min-w-[200px]">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project</Label>
            <p className="mt-1.5 text-sm font-medium">{currentUser.assignedProjectName}</p>
          </div>
        )}
      </div>
      <div id="machinery-table" className="border-2 border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Machine</th>
                <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Ownership</th>
                <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Rate/Hr</th>
                <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Hours</th>
                <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Total Cost</th>
                <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Paid</th>
                <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Pending</th>
                {canEditDelete && (
                  <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={canEditDelete ? 8 : 7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : error ? (
                <tr><td colSpan={canEditDelete ? 8 : 7} className="px-4 py-8 text-center text-destructive">{error}</td></tr>
              ) : machines.length === 0 ? (
                <tr><td colSpan={canEditDelete ? 8 : 7} className="px-4 py-8 text-center text-muted-foreground">No machines.</td></tr>
              ) : (
                machines.map((m) => (
                  <tr key={m.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/machinery/${m.id}`} className="font-bold hover:underline">{m.name}</Link>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={m.ownership} /></td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatCurrency(m.hourlyRate)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{m.totalHours}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold">{formatCurrency(m.totalCost)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-success">{formatCurrency(m.totalPaid)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-destructive">{m.totalPending > 0 ? formatCurrency(m.totalPending) : "—"}</td>
                    {canEditDelete && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditMachine(m); setEditOpen(true); }} aria-label="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(m)} aria-label="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="print-hidden">
          <TablePagination
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            page={page}
            totalPages={totalPages}
            totalItems={total}
            onPrevious={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            canPrevious={page > 1}
            canNext={page < totalPages}
            startIndexOneBased={startIndexOneBased}
            endIndex={endIndex}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
          />
        </div>
      </div>
    </Layout>
  );
}
