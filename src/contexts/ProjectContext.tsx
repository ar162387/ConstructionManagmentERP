import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProjects } from '@/services/projectService';
import { Project } from '@/types';

interface ProjectContextType {
  /** Selected project ID, or null for "All" (admin/super_admin only). */
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  /** Projects available to the current user (all for admin/super_admin, assigned only for site_manager). */
  availableProjects: Project[];
  /** The selected project object when one project is selected. */
  selectedProject: Project | null;
  /** Whether current user can see "All" (admin/super_admin). Site managers are scoped to assigned projects only. */
  canViewAllProjects: boolean;
  /** Refetch projects from API */
  refreshProjects: () => Promise<void>;
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!user) {
      setAvailableProjects([]);
      return;
    }
    setIsLoading(true);
    try {
      const projects = await getProjects();
      setAvailableProjects(projects);
    } catch {
      setAvailableProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const { filteredProjects, canViewAllProjects } = useMemo(() => {
    if (!user) {
      return { filteredProjects: [], canViewAllProjects: false };
    }
    if (user.role === 'super_admin' || user.role === 'admin') {
      return { filteredProjects: availableProjects, canViewAllProjects: true };
    }
    const assigned = user.assignedProjects ?? [];
    const projects = availableProjects.filter((p) => assigned.includes(p.id));
    return { filteredProjects: projects, canViewAllProjects: false };
  }, [user, availableProjects]);

  useEffect(() => {
    if (!canViewAllProjects && filteredProjects.length > 0 && selectedProjectId === null) {
      setSelectedProjectId(filteredProjects[0].id);
    }
  }, [canViewAllProjects, filteredProjects, selectedProjectId]);

  const selectedProject = useMemo(
    () => (selectedProjectId ? filteredProjects.find((p) => p.id === selectedProjectId) ?? null : null),
    [selectedProjectId, filteredProjects]
  );

  const value: ProjectContextType = {
    selectedProjectId,
    setSelectedProjectId,
    availableProjects: filteredProjects,
    selectedProject,
    canViewAllProjects,
    refreshProjects: loadProjects,
    isLoading,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

/**
 * True if current user can edit records.
 * - Super admin: always true
 * - Admin: user.canEdit ?? true
 * - Site manager: always false
 */
export function useCanEdit(): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  if (user.role === 'admin') return user.canEdit ?? true;
  return false;
}

/**
 * True if current user can delete records.
 * - Super admin: always true
 * - Admin: user.canDelete ?? true
 * - Site manager: always false
 */
export function useCanDelete(): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  if (user.role === 'admin') return user.canDelete ?? true;
  return false;
}

/**
 * True if current user can both edit AND delete records.
 * Use when showing Edit + Delete together (e.g. dropdown menu) to hide both when either is restricted.
 * - Super admin: always true
 * - Admin: (canEdit ?? true) && (canDelete ?? true)
 * - Site manager: always false
 */
export function useCanEditDelete(): boolean {
  const canEdit = useCanEdit();
  const canDelete = useCanDelete();
  return canEdit && canDelete;
}
