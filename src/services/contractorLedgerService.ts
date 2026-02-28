import { api } from "./api";

export interface ApiContractorLedgerRow {
  type: "entry" | "payment";
  id: string;
  contractorId?: string;
  contractorName?: string;
  date: string;
  amount: number;
  remarks?: string;
  referenceId?: string;
  paymentMethod?: "Cash" | "Bank" | "Online";
}

export interface ApiContractorLedger {
  rows: ApiContractorLedgerRow[];
  totalAmount: number;
  totalPaid: number;
  remaining: number;
  total: number;
}

export interface GetContractorLedgerParams {
  contractorId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateContractorEntryInput {
  contractorId: string;
  projectId: string;
  date: string;
  amount: number;
  remarks?: string;
}

export interface CreateContractorPaymentInput {
  date: string;
  amount: number;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
}

export async function getContractorLedger(
  projectId: string,
  month: string,
  params?: GetContractorLedgerParams
): Promise<ApiContractorLedger> {
  const sp = new URLSearchParams({ projectId, month });
  if (params?.contractorId != null) sp.set("contractorId", params.contractorId);
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.pageSize != null) sp.set("pageSize", String(params.pageSize));
  return api<ApiContractorLedger>(`/api/contractors/ledger?${sp}`);
}

export async function createContractorEntry(input: CreateContractorEntryInput): Promise<{
  id: string;
  contractorId: string;
  date: string;
  amount: number;
  remarks: string;
}> {
  return api("/api/contractors/entries", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createContractorPayment(
  contractorId: string,
  input: CreateContractorPaymentInput
): Promise<{
  id: string;
  contractorId: string;
  date: string;
  amount: number;
  paymentMethod: string;
  referenceId?: string;
}> {
  return api(`/api/contractors/${contractorId}/payments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteContractorEntry(entryId: string): Promise<void> {
  return api(`/api/contractors/entries/${entryId}`, { method: "DELETE" });
}

export async function deleteContractorPayment(paymentId: string): Promise<void> {
  return api(`/api/contractors/payments/${paymentId}`, { method: "DELETE" });
}
