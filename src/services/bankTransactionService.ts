/**
 * Bank Transaction API service
 */

import { api } from "./api";

export interface ApiBankTransaction {
  id: string;
  accountId: string;
  accountName?: string;
  date: string;
  type: "inflow" | "outflow";
  amount: number;
  source: string;
  destination: string;
  projectId?: string;
  projectName?: string;
  mode: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

export interface ListBankTransactionsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface ListBankTransactionsResult {
  rows: ApiBankTransaction[];
  total: number;
}

export interface CreateBankTransactionInput {
  accountId: string;
  date: string;
  type: "inflow" | "outflow";
  amount: number;
  source: string;
  destination: string;
  projectId?: string;
  mode?: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

export interface UpdateBankTransactionInput {
  date?: string;
  amount?: number;
  source?: string;
  destination?: string;
  projectId?: string;
  mode?: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

function buildQuery(params: ListBankTransactionsParams): string {
  const searchParams = new URLSearchParams();
  if (params.page != null) searchParams.set("page", String(params.page));
  if (params.pageSize != null) searchParams.set("pageSize", String(params.pageSize));
  if (params.search) searchParams.set("search", params.search);
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);
  const q = searchParams.toString();
  return q ? `?${q}` : "";
}

export async function listBankTransactions(params: ListBankTransactionsParams = {}): Promise<ListBankTransactionsResult> {
  return api<ListBankTransactionsResult>(`/api/bank-transactions${buildQuery(params)}`);
}

export async function createBankTransaction(input: CreateBankTransactionInput): Promise<ApiBankTransaction> {
  return api<ApiBankTransaction>("/api/bank-transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateBankTransaction(id: string, input: UpdateBankTransactionInput): Promise<ApiBankTransaction> {
  return api<ApiBankTransaction>(`/api/bank-transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteBankTransaction(id: string): Promise<void> {
  return api<void>(`/api/bank-transactions/${id}`, {
    method: "DELETE",
  });
}
