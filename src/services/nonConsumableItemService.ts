import { api } from './api';
import type { NonConsumableItem } from '@/types';

export interface NonConsumableItemFromApi {
  id: string;
  name: string;
  storeQty: number;
  damagedQty: number;
  lostQty: number;
  totalAssigned: number;
  assignments?: { projectId: string; project?: { id: string; name: string }; quantity: number }[];
  createdAt: string;
}

function toNonConsumableItem(c: NonConsumableItemFromApi): NonConsumableItem {
  return {
    id: c.id,
    name: c.name,
    storeQty: c.storeQty,
    damagedQty: c.damagedQty,
    lostQty: c.lostQty,
    totalAssigned: c.totalAssigned,
    assignments: c.assignments,
    createdAt: c.createdAt,
  };
}

export async function getNonConsumableItems(): Promise<NonConsumableItem[]> {
  const { data } = await api.get<{ data: NonConsumableItemFromApi[] }>('/non-consumable-items');
  return data.data.map(toNonConsumableItem);
}

export async function getNonConsumableItem(id: string): Promise<NonConsumableItem> {
  const { data } = await api.get<{ data: NonConsumableItemFromApi }>(`/non-consumable-items/${id}`);
  return toNonConsumableItem(data.data);
}

export interface CreateNonConsumableItemPayload {
  name: string;
}

export async function createNonConsumableItem(
  payload: CreateNonConsumableItemPayload
): Promise<NonConsumableItem> {
  const { data } = await api.post<{ data: NonConsumableItemFromApi }>('/non-consumable-items', {
    name: payload.name.trim(),
  });
  return toNonConsumableItem(data.data);
}

export interface UpdateNonConsumableItemPayload {
  name?: string;
}

export async function updateNonConsumableItem(
  itemId: string,
  payload: UpdateNonConsumableItemPayload
): Promise<NonConsumableItem> {
  const { data } = await api.put<{ data: NonConsumableItemFromApi }>(
    `/non-consumable-items/${itemId}`,
    { name: payload.name?.trim() }
  );
  return toNonConsumableItem(data.data);
}

export async function deleteNonConsumableItem(itemId: string): Promise<void> {
  await api.delete(`/non-consumable-items/${itemId}`);
}
