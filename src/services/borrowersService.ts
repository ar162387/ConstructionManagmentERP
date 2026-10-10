import { api } from "./api";

export interface ApiBorrower {
  id: string;
  name: string;
  archived: boolean;
  totalLoaned: number;
  totalRepaid: number;
  outstanding: number;
}
export interface BorrowerLedgerRow {
  id: string; date: string; type: "inflow" | "outflow"; amount: number;
  loanGiven: number; repayment: number; accountId: string; accountName: string;
  borrowerName: string; mode: "Cash" | "Bank" | "Online";
  referenceId?: string; remarks?: string; balance: number;
}
export interface BorrowerLedgerResult {
  borrowerId: string; borrowerName: string; archived: boolean;
  totalLoaned: number; totalRepaid: number; outstanding: number; rows: BorrowerLedgerRow[];
}
export const listBorrowers = (archived = false) => api<ApiBorrower[]>(`/api/borrowers?archived=${archived}`);
export const createBorrower = (name: string) => api<ApiBorrower>("/api/borrowers", { method: "POST", body: JSON.stringify({ name }) });
export const updateBorrower = (id: string, name: string) => api<Pick<ApiBorrower, "id" | "name" | "archived">>(`/api/borrowers/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
export const deleteBorrower = (id: string) => api<void>(`/api/borrowers/${id}`, { method: "DELETE" });
export const getBorrowerLedger = (id: string) => api<BorrowerLedgerResult>(`/api/borrowers/${id}/ledger`);
