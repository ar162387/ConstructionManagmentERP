import { api } from './api';
import type { ConsumableItem } from '@/types';

export interface ConsumableItemFromApi {
  id: string;
  name: string;
  unitId: string;
  unit?: { id: string; name: string; symbol: string | null } | null;
  currentStock: number;
  createdAt: string;
}

function toConsumableItem(c: ConsumableItemFromApi): ConsumableItem {
  return {
    id: c.id,
    name: c.name,
    unitId: c.unitId,
    currentStock: c.currentStock,
  };
}

export async function getConsumableItems(): Promise<ConsumableItem[]> {
  const { data } = await api.get<{ data: ConsumableItemFromApi[] }>('/consumable-items');
  return data.data.map(toConsumableItem);
}

export interface CreateConsumableItemPayload {
  name: string;
  unitId: string;
  currentStock?: number;
}

export async function createConsumableItem(
  payload: CreateConsumableItemPayload
): Promise<ConsumableItem> {
  const { data } = await api.post<{ data: ConsumableItemFromApi }>('/consumable-items', {
    name: payload.name,
    unit_id: payload.unitId,
    current_stock: payload.currentStock ?? 0,
  });
  return toConsumableItem(data.data);
}

export interface UpdateConsumableItemPayload {
  name?: string;
  unitId?: string;
  currentStock?: number;
}

export async function updateConsumableItem(
  itemId: string,
  payload: UpdateConsumableItemPayload
): Promise<ConsumableItem> {
  const { data } = await api.put<{ data: ConsumableItemFromApi }>(
    `/consumable-items/${itemId}`,
    {
      name: payload.name,
      unit_id: payload.unitId,
      current_stock: payload.currentStock,
    }
  );
  return toConsumableItem(data.data);
}

export async function deleteConsumableItem(itemId: string): Promise<void> {
  await api.delete(`/consumable-items/${itemId}`);
}
