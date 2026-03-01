/**
 * Bank Account API service
 */

import { api } from "./api";

export interface ApiBankAccount {
  id: string;
  name: string;
  accountNumber: string;
  openingBalance: number;
  currentBalance: number;
  totalInflow: number;
  totalOutflow: number;
}

export interface CreateBankAccountInput {
  name: string;
  accountNumber?: string;
  openingBalance?: number;
}

export interface UpdateBankAccountInput {
  name?: string;
  accountNumber?: string;
  openingBalance?: number;
}

export async function listBankAccounts(): Promise<ApiBankAccount[]> {
  return api<ApiBankAccount[]>("/api/bank-accounts");
}

export async function createBankAccount(input: CreateBankAccountInput): Promise<ApiBankAccount> {
  return api<ApiBankAccount>("/api/bank-accounts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateBankAccount(id: string, input: UpdateBankAccountInput): Promise<ApiBankAccount> {
  return api<ApiBankAccount>(`/api/bank-accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteBankAccount(id: string): Promise<void> {
  return api<void>(`/api/bank-accounts/${id}`, {
    method: "DELETE",
  });
}
