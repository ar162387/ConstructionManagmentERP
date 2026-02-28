import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { useAuth } from "@/context/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { CreateProjectDialog } from "@/components/dialogs/CreateProjectDialog";
import { EditProjectDialog } from "@/components/dialogs/EditProjectDialog";
import { deleteProject } from "@/services/projectsService";
import type { ApiProject } from "@/services/projectsService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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
import { Plus, Calendar, Wallet, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProjectCardProps {
  p: ApiProject;
  canManage: boolean;
  onEdit: (project: ApiProject) => void;
  onDelete: (project: ApiProject) => void;
}

function ProjectCard({ p, canManage, onEdit, onDelete }: ProjectCardProps) {
  const budgetPercent = p.allocatedBudget > 0 ? Math.min(100, (p.spent / p.allocatedBudget) * 100) : 0;
  const isOverBudget = p.spent > p.allocatedBudget;

  return (
    <Card className="flex flex-col border-2 border-border hover:border-primary/30 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-muted-foreground truncate">{p.id}</p>
            <h3 className="font-bold text-lg break-words">{p.name}</h3>
          </div>
          <StatusBadge status={p.status} />
        </div>
        {p.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-3 pt-0">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              Budget
            </span>
            <span className="font-mono text-xs">{formatCurrency(p.allocatedBudget)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Spent</span>
            <span className={cn("font-mono text-xs", isOverBudget && "text-destructive font-semibold")}>
              {formatCurrency(p.spent)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isOverBudget ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${Math.min(100, budgetPercent)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{p.startDate} → {p.endDate}</span>
        </div>
      </CardContent>
      <CardFooter className="pt-0 border-t border-border mt-auto flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {budgetPercent.toFixed(0)}% of budget used
          {isOverBudget && " (over budget)"}
        </p>
        {canManage && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(p)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(p)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export default function Projects() {
  const { user: currentUser } = useAuth();
  const { projects, loading, error, refetch } = useProjects();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ApiProject | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const actorRole = currentUser?.role ?? "";
  const isSiteManager = actorRole === "Site Manager";
  const canCreateProject = actorRole === "Admin" || actorRole === "Super Admin";
  const canManageProjects = actorRole === "Super Admin";

  // Site Manager sees only their assigned project
  const visibleProjects = useMemo(() => {
    if (!isSiteManager || !currentUser?.assignedProjectId) return projects;
    return projects.filter((p) => p.id === currentUser.assignedProjectId);
  }, [projects, isSiteManager, currentUser?.assignedProjectId]);

  const openEdit = (project: ApiProject) => {
    setSelectedProject(project);
    setEditOpen(true);
  };

  const openDelete = (project: ApiProject) => {
    setSelectedProject(project);
    setDeleteOpen(true);
  };

  const handleEditOpenChange = (open: boolean) => {
    setEditOpen(open);
    if (!open) setSelectedProject(null);
  };

  const handleDeleteOpenChange = (open: boolean) => {
    setDeleteOpen(open);
    if (!open) setSelectedProject(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProject) return;
    setDeleteLoading(true);
    try {
      await deleteProject(selectedProject.id);
      toast.success("Project deleted");
      setDeleteOpen(false);
      setSelectedProject(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Projects"
        subtitle={isSiteManager ? "Your assigned project" : "Manage all construction projects"}
        printTargetId="projects-cards"
        actions={
          canCreateProject ? (
            <Button variant="warning" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Project
            </Button>
          ) : undefined
        }
      />
      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refetch}
      />
      <EditProjectDialog
        open={editOpen}
        onOpenChange={handleEditOpenChange}
        project={selectedProject}
        onSave={refetch}
      />
      {loading ? (
        <p className="text-muted-foreground py-8 text-center">Loading projects…</p>
      ) : error ? (
        <p className="text-destructive py-8 text-center">{error}</p>
      ) : isSiteManager && visibleProjects.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          You are not assigned to any project. Contact your administrator.
        </p>
      ) : (
        <div id="projects-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleProjects.map((p) => (
            <ProjectCard
              key={p.id}
              p={p}
              canManage={canManageProjects}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          ))}
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedProject?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
