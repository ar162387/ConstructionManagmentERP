import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProject, useCanEditDelete } from '@/contexts/ProjectContext';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectDialog } from '@/components/modals/ProjectDialog';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';
import { Project } from '@/types';
import { toast } from '@/hooks/use-toast';
import { createProject, updateProject, deleteProject } from '@/services/projectService';
import { useAuth } from '@/contexts/AuthContext';

export default function Projects() {
  const { isAuthenticated, user } = useAuth();
  const { availableProjects, refreshProjects, isLoading } = useProject();
  const canEditDelete = useCanEditDelete();
  const isSuperAdmin = user?.role === 'super_admin';
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const filteredProjects = availableProjects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeProjects = filteredProjects.filter((p) => p.status === 'active');
  const completedProjects = filteredProjects.filter((p) => p.status === 'completed');
  const onHoldProjects = filteredProjects.filter((p) => p.status === 'on_hold');

  const handleAddProject = () => {
    setSelectedProject(null);
    setProjectDialogOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setProjectDialogOpen(true);
  };

  const handleSaveProject = async (data: Partial<Project>) => {
    setIsSubmitting(true);
    try {
      if (selectedProject?.id) {
        await updateProject(selectedProject.id, {
          name: data.name!,
          budget: data.budget!,
          description: data.description,
          status: data.status,
          startDate: data.startDate?.toISOString().split('T')[0],
          endDate: data.endDate?.toISOString().split('T')[0],
        });
        toast({
          title: 'Project Updated',
          description: `${data.name} has been updated successfully.`,
        });
      } else {
        await createProject({
          name: data.name!,
          budget: data.budget!,
          description: data.description,
          status: data.status,
          startDate: data.startDate?.toISOString().split('T')[0],
          endDate: data.endDate?.toISOString().split('T')[0],
        });
        toast({
          title: 'Project Created',
          description: `${data.name} has been created successfully.`,
        });
      }
      setProjectDialogOpen(false);
      await refreshProjects();
    } catch (err: unknown) {
      let message = 'An error occurred.';
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response;
        const errData = res?.data;
        if (errData?.message) message = errData.message;
        else if (errData?.errors && typeof errData.errors === 'object') {
          message = Object.values(errData.errors).flat().join(' ');
        }
      }
      toast({
        title: selectedProject ? 'Update Failed' : 'Create Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteProject(projectToDelete.id);
      toast({
        title: 'Project Deleted',
        description: 'The project has been deleted successfully.',
      });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      await refreshProjects();
    } catch (err: unknown) {
      const res = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: unknown } }).response?.data : undefined;
      const data = res && typeof res === 'object' ? res as { message?: string; errors?: { project?: string[] } } : undefined;
      const detail = data?.errors?.project?.[0] ?? data?.message;
      const msg = typeof detail === 'string' ? detail : 'Could not delete the project. It may have related data (stock consumption, assigned site managers). Remove or reassign them first.';
      toast({
        title: 'Delete Failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProjectGrid = (projects: Project[]) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => navigate(`/projects/${project.id}`)}
          showActions={isSuperAdmin}
          onEdit={isSuperAdmin ? () => handleEditProject(project) : undefined}
          onDelete={isSuperAdmin ? () => { setProjectToDelete(project); setDeleteDialogOpen(true); } : undefined}
        />
      ))}
    </div>
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Manage and monitor all your construction projects
            </p>
          </div>
          {canEditDelete && (
            <Button className="w-fit" onClick={handleAddProject}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search projects..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Project Stats */}
        <div className="flex gap-4 flex-wrap">
          <Badge variant="outline" className="px-4 py-2 text-sm">
            Total: {availableProjects.length}
          </Badge>
          <Badge className="px-4 py-2 text-sm bg-accent text-accent-foreground">
            Active: {activeProjects.length}
          </Badge>
          <Badge variant="secondary" className="px-4 py-2 text-sm">
            Completed: {completedProjects.length}
          </Badge>
          <Badge variant="outline" className="px-4 py-2 text-sm">
            On Hold: {onHoldProjects.length}
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Projects</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="on_hold">On Hold</TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <TabsContent value="all" className="space-y-4">
                {filteredProjects.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    No projects found.
                  </div>
                ) : (
                  renderProjectGrid(filteredProjects)
                )}
              </TabsContent>

              <TabsContent value="active" className="space-y-4">
                {activeProjects.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    No active projects.
                  </div>
                ) : (
                  renderProjectGrid(activeProjects)
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                {completedProjects.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    No completed projects.
                  </div>
                ) : (
                  renderProjectGrid(completedProjects)
                )}
              </TabsContent>

              <TabsContent value="on_hold" className="space-y-4">
                {onHoldProjects.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    No projects on hold.
                  </div>
                ) : (
                  renderProjectGrid(onHoldProjects)
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* Dialogs */}
      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        project={selectedProject}
        onSave={handleSaveProject}
        isSubmitting={isSubmitting}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setProjectToDelete(null);
        }}
        title="Delete Project"
        description="Are you sure you want to delete this project? All associated data will be lost."
        onConfirm={handleDeleteProject}
      />
    </AppLayout>
  );
}
