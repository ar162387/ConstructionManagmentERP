/**
 * Projects API service - CRUD for project management
 */

import { api } from "./api";

export interface ApiProject {
  id: string;
  name: string;
  description: string;
  allocatedBudget: number;
  status: "Active" | "On Hold" | "Completed";
  startDate: string;
  endDate: string;
  spent: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  allocatedBudget: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  allocatedBudget?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export async function listProjects(): Promise<ApiProject[]> {
  return api<ApiProject[]>("/api/projects");
}

export async function createProject(input: CreateProjectInput): Promise<ApiProject> {
  return api<ApiProject>("/api/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<ApiProject> {
  return api<ApiProject>(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteProject(id: string): Promise<void> {
  return api<void>(`/api/projects/${id}`, {
    method: "DELETE",
  });
}
