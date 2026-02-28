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

/** projectId: filter by project. Omit for all vendors (Admin/Super Admin only, for dashboards). */
export async function listVendors(projectId?: string | null): Promise<ApiVendor[]> {
  const url = projectId ? `/api/vendors?${new URLSearchParams({ projectId })}` : "/api/vendors";
  return api<ApiVendor[]>(url);
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
