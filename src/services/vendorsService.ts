/**
 * Vendors API service - CRUD for vendor management
 */

import { api } from "./api";

export interface ApiVendor {
  id: string;
  projectId: string;
  name: string;
  phone: string;
  description: string;
  totalBilled: number;
  totalPaid: number;
  remaining: number;
  advanceBalance: number;
}

export interface CreateVendorInput {
  projectId: string;
  name: string;
  phone?: string;
  description?: string;
}

export interface UpdateVendorInput {
  name?: string;
  phone?: string;
  description?: string;
}

/** projectId: filter by project. Omit for all vendors (Admin/Super Admin only, for dashboards).
 *  startDate/endDate: optional inclusive date range — when both set, totals reflect that period. */
export async function listVendors(
  projectId?: string | null,
  startDate?: string | null,
  endDate?: string | null
): Promise<ApiVendor[]> {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const q = params.toString();
  return api<ApiVendor[]>(`/api/vendors${q ? `?${q}` : ""}`);
}

export async function getVendor(id: string): Promise<ApiVendor> {
  return api<ApiVendor>(`/api/vendors/${id}`);
}

export async function createVendor(input: CreateVendorInput): Promise<ApiVendor> {
  return api<ApiVendor>("/api/vendors", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateVendor(id: string, input: UpdateVendorInput): Promise<ApiVendor> {
  return api<ApiVendor>(`/api/vendors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteVendor(id: string): Promise<void> {
  return api<void>(`/api/vendors/${id}`, {
    method: "DELETE",
  });
}
