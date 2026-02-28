import { api } from "./api";

export interface ApiVendorPayment {
  id: string;
  vendorId: string;
  date: string;
  amount: number;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

export interface ApiVendorLedgerRow {
  type: "purchase" | "payment";
  id: string;
  date: string;
  itemName?: string;
  quantity?: number;
  totalPrice?: number;
  paidAmount?: number;
  remaining?: number;
  amount?: number;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

export interface ApiVendorLedger {
  rows: ApiVendorLedgerRow[];
  totalBilled: number;
  totalPaid: number;
  remaining: number;
  total: number;
}

export interface GetVendorLedgerParams {
  page?: number;
  pageSize?: number;
}

export interface CreateVendorPaymentInput {
  date: string;
  amount: number;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

export async function getVendorLedger(
  vendorId: string,
  params?: GetVendorLedgerParams
): Promise<ApiVendorLedger> {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.pageSize != null) sp.set("pageSize", String(params.pageSize));
  const q = sp.toString();
  return api<ApiVendorLedger>(`/api/vendors/${vendorId}/ledger${q ? `?${q}` : ""}`);
}

export async function createVendorPayment(
  vendorId: string,
  input: CreateVendorPaymentInput
): Promise<ApiVendorPayment> {
  return api<ApiVendorPayment>(`/api/vendors/${vendorId}/payments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteVendorPayment(vendorId: string, paymentId: string): Promise<void> {
  return api<void>(`/api/vendors/${vendorId}/payments/${paymentId}`, { method: "DELETE" });
}
