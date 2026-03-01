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

export interface ApiContractorLedgerAllTime {
  rows: ApiContractorLedgerRow[];
  total: number;
}

function getLastNMonthKeys(n: number): string[] {
  const now = new Date();
  const result: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}

const CONTRACTOR_HISTORY_MONTHS = 60;

/** Fetch all entries and payments for a contractor across last N months, merge and paginate client-side. */
export async function getContractorLedgerAllTime(
  projectId: string,
  contractorId: string,
  options?: { page?: number; pageSize?: number }
): Promise<ApiContractorLedgerAllTime> {
  const months = getLastNMonthKeys(CONTRACTOR_HISTORY_MONTHS);
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 12));

  const results = await Promise.all(
    months.map((month) =>
      getContractorLedger(projectId, month, {
        contractorId,
        page: 1,
        pageSize: 100,
      })
    )
  );

  const seen = new Set<string>();
  const rows: ApiContractorLedgerRow[] = [];
  for (const r of results) {
    for (const row of r.rows) {
      const key = `${row.type}-${row.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        rows.push(row);
      }
    }
  }
  rows.sort((a, b) => b.date.localeCompare(a.date));

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const paginatedRows = rows.slice(start, start + pageSize);

  return { rows: paginatedRows, total };
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
