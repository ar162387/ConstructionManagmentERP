import { api } from './api';
import type { Vendor } from '@/types';

export interface VendorFromApi {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  createdAt: string;
}

function toVendor(v: VendorFromApi): Vendor {
  return {
    id: v.id,
    name: v.name,
    contactPerson: v.contactPerson ?? '',
    phone: v.phone ?? '',
    email: v.email ?? '',
    totalBilled: v.totalBilled,
    totalPaid: v.totalPaid,
    outstanding: v.outstanding,
  };
}

export async function getVendors(): Promise<Vendor[]> {
  const { data } = await api.get<{ data: VendorFromApi[] }>('/vendors');
  return data.data.map(toVendor);
}

export interface CreateVendorPayload {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

export async function createVendor(payload: CreateVendorPayload): Promise<Vendor> {
  const { data } = await api.post<{ data: VendorFromApi }>('/vendors', {
    name: payload.name,
    contact_person: payload.contactPerson ?? null,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
  });
  return toVendor(data.data);
}

export interface UpdateVendorPayload {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

export async function updateVendor(
  vendorId: string,
  payload: UpdateVendorPayload
): Promise<Vendor> {
  const { data } = await api.put<{ data: VendorFromApi }>(`/vendors/${vendorId}`, {
    name: payload.name,
    contact_person: payload.contactPerson ?? null,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
  });
  return toVendor(data.data);
}

export async function deleteVendor(vendorId: string): Promise<void> {
  await api.delete(`/vendors/${vendorId}`);
}
