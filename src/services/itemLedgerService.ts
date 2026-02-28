import { api } from "./api";

export interface ApiItemLedgerEntry {
  id: string;
  projectId: string;
  itemId: string;
  vendorId: string;
  vendorName: string;
  date: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paidAmount: number;
  remaining: number;
  biltyNumber?: string;
  vehicleNumber?: string;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

export interface CreateItemLedgerInput {
  vendorId: string;
  date: string;
  quantity: number;
  unitPrice: number;
  paidAmount?: number;
  biltyNumber?: string;
  vehicleNumber?: string;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

export interface UpdateItemLedgerInput {
  vendorId?: string;
  date?: string;
  quantity?: number;
  unitPrice?: number;
  paidAmount?: number;
  biltyNumber?: string;
  vehicleNumber?: string;
  paymentMethod?: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

export interface ListItemLedgerParams {
  page?: number;
  pageSize?: number;
}

export interface ListItemLedgerResponse {
  entries: ApiItemLedgerEntry[];
  total: number;
}

export async function listItemLedger(
  itemId: string,
  params?: ListItemLedgerParams
): Promise<ListItemLedgerResponse> {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.pageSize != null) sp.set("pageSize", String(params.pageSize));
  const q = sp.toString();
  return api<ListItemLedgerResponse>(`/api/consumable-items/${itemId}/ledger${q ? `?${q}` : ""}`);
}

export async function createItemLedgerEntry(
  itemId: string,
  input: CreateItemLedgerInput
): Promise<ApiItemLedgerEntry> {
  return api<ApiItemLedgerEntry>(`/api/consumable-items/${itemId}/ledger`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateItemLedgerEntry(
  itemId: string,
  entryId: string,
  input: UpdateItemLedgerInput
): Promise<ApiItemLedgerEntry> {
  return api<ApiItemLedgerEntry>(`/api/consumable-items/${itemId}/ledger/${entryId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteItemLedgerEntry(itemId: string, entryId: string): Promise<void> {
  return api<void>(`/api/consumable-items/${itemId}/ledger/${entryId}`, { method: "DELETE" });
}
