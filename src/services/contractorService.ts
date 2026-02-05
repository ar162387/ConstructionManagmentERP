import { api } from './api';
import type { Contractor } from '@/types';

export interface ContractorFromApi {
  id: string;
  projectId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
}

function toContractor(c: ContractorFromApi): Contractor {
  return {
    id: c.id,
    projectId: c.projectId,
    name: c.name,
    contactPerson: c.contactPerson ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    createdAt: c.createdAt,
  };
}

export async function getContractors(projectId: string): Promise<Contractor[]> {
  const { data } = await api.get<{ data: ContractorFromApi[] }>('/contractors', {
    params: { project_id: projectId },
  });
  return data.data.map(toContractor);
}

export interface CreateContractorPayload {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

export async function createContractor(
  projectId: string,
  payload: CreateContractorPayload
): Promise<Contractor> {
  const { data } = await api.post<{ data: ContractorFromApi }>('/contractors', {
    project_id: projectId,
    name: payload.name,
    contact_person: payload.contactPerson ?? null,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
  });
  return toContractor(data.data);
}

export interface UpdateContractorPayload {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

export async function updateContractor(
  contractorId: string,
  payload: UpdateContractorPayload
): Promise<Contractor> {
  const { data } = await api.put<{ data: ContractorFromApi }>(
    `/contractors/${contractorId}`,
    {
      name: payload.name,
      contact_person: payload.contactPerson ?? null,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
    }
  );
  return toContractor(data.data);
}

export async function deleteContractor(contractorId: string): Promise<void> {
  await api.delete(`/contractors/${contractorId}`);
}
