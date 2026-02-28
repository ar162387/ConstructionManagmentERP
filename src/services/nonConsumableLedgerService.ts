import { api } from "./api";

export type NonConsumableEventType =
  | "Purchase"
  | "AssignToProject"
  | "ReturnToCompany"
  | "Repair"
  | "ReturnFromRepair"
  | "MarkLost";

export interface ApiNonConsumableLedgerEntry {
  id: string;
  itemId: string;
  date: string;
  eventType: NonConsumableEventType;
  quantity: number;
  totalCost?: number;
  projectTo?: string;
  projectToName?: string;
  projectFrom?: string;
  projectFromName?: string;
  remarks?: string;
  createdBy: string;
}

export interface CreateNonConsumableLedgerInput {
  date: string;
  eventType: NonConsumableEventType;
  quantity: number;
  totalCost?: number;
  projectTo?: string;
  projectFrom?: string;
  remarks?: string;
}

export interface UpdateNonConsumableLedgerInput {
  date?: string;
  eventType?: NonConsumableEventType;
  quantity?: number;
  totalCost?: number;
  projectTo?: string;
  projectFrom?: string;
  remarks?: string;
}

export interface ListNonConsumableLedgerParams {
  page?: number;
  pageSize?: number;
}

export interface ListNonConsumableLedgerResponse {
  entries: ApiNonConsumableLedgerEntry[];
  total: number;
}

export async function listNonConsumableLedger(
  itemId: string,
  params?: ListNonConsumableLedgerParams
): Promise<ListNonConsumableLedgerResponse> {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.pageSize != null) sp.set("pageSize", String(params.pageSize));
  const q = sp.toString();
  return api<ListNonConsumableLedgerResponse>(
    `/api/non-consumable-items/${itemId}/ledger${q ? `?${q}` : ""}`
  );
}

export async function createNonConsumableLedgerEntry(
  itemId: string,
  input: CreateNonConsumableLedgerInput
): Promise<ApiNonConsumableLedgerEntry> {
  return api<ApiNonConsumableLedgerEntry>(`/api/non-consumable-items/${itemId}/ledger`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateNonConsumableLedgerEntry(
  itemId: string,
  entryId: string,
  input: UpdateNonConsumableLedgerInput
): Promise<ApiNonConsumableLedgerEntry> {
  return api<ApiNonConsumableLedgerEntry>(
    `/api/non-consumable-items/${itemId}/ledger/${entryId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}

export async function deleteNonConsumableLedgerEntry(
  itemId: string,
  entryId: string
): Promise<void> {
  return api<void>(`/api/non-consumable-items/${itemId}/ledger/${entryId}`, {
    method: "DELETE",
  });
}
