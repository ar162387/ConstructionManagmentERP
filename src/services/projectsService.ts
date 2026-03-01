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
  balance?: number;
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

export interface ApiProjectSummary {
  spent: number;
  liabilities: number;
  breakdown?: {
    vendor: { spent: number; liabilities: number };
    contractor: { spent: number; liabilities: number };
    employee: { spent: number; liabilities: number };
    machinery: { spent: number; liabilities: number };
    nonConsumable: { spent: number; liabilities: number };
    expense: { spent: number; liabilities: number };
  };
}

export async function getProjectSummary(projectId: string): Promise<ApiProjectSummary> {
  return api<ApiProjectSummary>(`/api/projects/${projectId}/summary`);
}
