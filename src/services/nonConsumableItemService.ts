import { api } from "./api";

export interface InUseByProjectEntry {
  projectId: string;
  projectName: string;
  quantity: number;
}

export interface ApiNonConsumableItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  totalQuantity: number;
  companyStore: number;
  inUse: number;
  underRepair: number;
  lost: number;
  inUseByProject?: InUseByProjectEntry[];
}

export interface CreateNonConsumableItemInput {
  name: string;
  category: string;
  unit?: string;
}

export interface UpdateNonConsumableItemInput {
  name?: string;
  category?: string;
  unit?: string;
}

export async function listNonConsumableItems(): Promise<ApiNonConsumableItem[]> {
  return api<ApiNonConsumableItem[]>("/api/non-consumable-items");
}

export async function getNonConsumableItem(id: string): Promise<ApiNonConsumableItem> {
  return api<ApiNonConsumableItem>(`/api/non-consumable-items/${id}`);
}

export async function createNonConsumableItem(
  input: CreateNonConsumableItemInput
): Promise<ApiNonConsumableItem> {
  return api<ApiNonConsumableItem>("/api/non-consumable-items", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateNonConsumableItem(
  id: string,
  input: UpdateNonConsumableItemInput
): Promise<ApiNonConsumableItem> {
  return api<ApiNonConsumableItem>(`/api/non-consumable-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteNonConsumableItem(id: string): Promise<void> {
  return api<void>(`/api/non-consumable-items/${id}`, { method: "DELETE" });
}
