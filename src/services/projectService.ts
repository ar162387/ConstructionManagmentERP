import { api } from './api';
import type { Project } from '@/types';

export interface ProjectFromApi {
  id: string;
  name: string;
  description: string;
  status: string;
  budget: number;
  spent: number;
  startDate: string;
  endDate?: string;
  managerId?: string;
  manager?: { id: string; name: string; email: string };
  siteManagers?: { id: string; name: string; email: string; role: string }[];
}

function toProject(p: ProjectFromApi): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    status: p.status as Project['status'],
    budget: p.budget,
    spent: p.spent,
    startDate: new Date(p.startDate),
    endDate: p.endDate ? new Date(p.endDate) : undefined,
    managerId: p.managerId ?? '',
    siteManagers: p.siteManagers ?? [],
  };
}

export async function getProjects(): Promise<Project[]> {
  const { data } = await api.get<{ data: ProjectFromApi[] }>('/projects');
  return data.data.map(toProject);
}

export interface CreateProjectPayload {
  name: string;
  budget: number;
  description?: string;
  status?: 'active' | 'completed' | 'on_hold';
  startDate?: string;
  endDate?: string;
  managerId?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  budget?: number;
  description?: string;
  status?: 'active' | 'completed' | 'on_hold';
  startDate?: string;
  endDate?: string;
  managerId?: string;
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const { data } = await api.post<{ data: ProjectFromApi }>('/projects', {
    name: payload.name,
    budget: payload.budget,
    description: payload.description,
    status: payload.status,
    startDate: payload.startDate,
    endDate: payload.endDate,
    managerId: payload.managerId,
  });
  return toProject(data.data);
}

export async function updateProject(projectId: string, payload: UpdateProjectPayload): Promise<Project> {
  const { data } = await api.put<{ data: ProjectFromApi }>(`/projects/${projectId}`, payload);
  return toProject(data.data);
}

export async function deleteProject(projectId: string): Promise<void> {
  await api.delete(`/projects/${projectId}`);
}
