import { api } from './api';
import type { ContractorBillingEntry } from '@/types';

export interface ContractorBillingEntryFromApi {
  id: string;
  projectId: string;
  contractorId: string;
  amount: number;
  remarks: string | null;
  entryDate: string;
  createdBy: string | null;
  createdAt: string;
  contractor?: { id: string; name: string };
}

export interface ContractorBillingKpis {
  totalBilled: number;
  totalPaid: number;
  remaining: number;
}

function toBillingEntry(e: ContractorBillingEntryFromApi): ContractorBillingEntry {
  return {
    id: e.id,
    projectId: e.projectId,
    contractorId: e.contractorId,
    amount: e.amount,
    remarks: e.remarks,
    entryDate: e.entryDate,
    createdBy: e.createdBy,
    createdAt: e.createdAt,
    contractor: e.contractor,
  };
}

export async function getBillingEntries(
  projectId: string,
  month: string,
  contractorId?: string
): Promise<{ entries: ContractorBillingEntry[]; kpis: ContractorBillingKpis }> {
  const params: Record<string, string> = {
    project_id: projectId,
    month,
  };
  if (contractorId) params.contractor_id = contractorId;
  const { data } = await api.get<{
    data: ContractorBillingEntryFromApi[];
    kpis: ContractorBillingKpis;
  }>('/contractor-billing-entries', { params });
  return {
    entries: data.data.map(toBillingEntry),
    kpis: data.kpis,
  };
}

export interface CreateBillingEntryPayload {
  projectId: string;
  contractorId: string;
  amount: number;
  remarks?: string;
  entryDate: string;
}

export async function createBillingEntry(
  payload: CreateBillingEntryPayload
): Promise<ContractorBillingEntry> {
  const { data } = await api.post<{ data: ContractorBillingEntryFromApi }>(
    '/contractor-billing-entries',
    {
      project_id: payload.projectId,
      contractor_id: payload.contractorId,
      amount: payload.amount,
      remarks: payload.remarks ?? null,
      entry_date: payload.entryDate,
    }
  );
  return toBillingEntry(data.data);
}

export interface UpdateBillingEntryPayload {
  amount?: number;
  remarks?: string;
  entryDate?: string;
}

export async function updateBillingEntry(
  id: string,
  payload: UpdateBillingEntryPayload
): Promise<ContractorBillingEntry> {
  const { data } = await api.put<{ data: ContractorBillingEntryFromApi }>(
    `/contractor-billing-entries/${id}`,
    {
      amount: payload.amount,
      remarks: payload.remarks ?? null,
      entry_date: payload.entryDate,
    }
  );
  return toBillingEntry(data.data);
}

export async function deleteBillingEntry(id: string): Promise<void> {
  await api.delete(`/contractor-billing-entries/${id}`);
}
