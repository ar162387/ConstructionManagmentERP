/**
 * Contractors API service - CRUD for contractor management
 */

import { api } from "./api";

export interface ApiContractor {
  id: string;
  projectId: string;
  name: string;
  phone: string;
  description: string;
}

export interface ApiContractorWithTotals extends ApiContractor {
  totalAmount: number;
  totalPaid: number;
  remaining: number;
}

export interface CreateContractorInput {
  projectId: string;
  name: string;
  phone?: string;
  description?: string;
}

export interface UpdateContractorInput {
  name?: string;
  phone?: string;
  description?: string;
}

/** projectId: filter by project. Omit for all contractors (Admin/Super Admin) or Site Manager uses assigned project.
 *  startDate/endDate: optional inclusive date range — when both set, totals reflect that period. */
export async function listContractors(
  projectId?: string | null,
  startDate?: string | null,
  endDate?: string | null
): Promise<ApiContractorWithTotals[]> {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const q = params.toString();
  return api<ApiContractorWithTotals[]>(`/api/contractors${q ? `?${q}` : ""}`);
}

export async function getContractor(id: string): Promise<ApiContractor> {
  return api<ApiContractor>(`/api/contractors/${id}`);
}

export async function createContractor(input: CreateContractorInput): Promise<ApiContractor> {
  return api<ApiContractor>("/api/contractors", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateContractor(id: string, input: UpdateContractorInput): Promise<ApiContractor> {
  return api<ApiContractor>(`/api/contractors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteContractor(id: string): Promise<void> {
  return api<void>(`/api/contractors/${id}`, {
    method: "DELETE",
  });
}
