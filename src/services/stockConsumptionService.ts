import { api } from './api';
import type { StockConsumptionEntry, StockConsumptionLineItem } from '@/types';

export interface StockConsumptionEntryFromApi {
  id: string;
  projectId: string;
  project?: { id: string; name: string } | null;
  remarks: string | null;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
  lineItems?: Array<{
    id: string;
    consumableItemId: string;
    quantity: number;
    consumableItem?: { id: string; name: string; unit?: { id: string; name: string; symbol: string | null } } | null;
  }>;
}

function toStockConsumptionEntry(
  e: StockConsumptionEntryFromApi
): StockConsumptionEntry & { lineItems?: StockConsumptionLineItem[] } {
  const entry: StockConsumptionEntry & { lineItems?: StockConsumptionLineItem[] } = {
    id: e.id,
    projectId: e.projectId,
    remarks: e.remarks ?? '',
    createdBy: typeof e.createdBy === 'object' && e.createdBy ? e.createdBy.id : '',
    createdAt: new Date(e.createdAt),
  };
  if (e.lineItems?.length) {
    entry.lineItems = e.lineItems.map((li) => ({
      id: li.id,
      consumptionEntryId: e.id,
      consumableItemId: li.consumableItemId,
      quantity: li.quantity,
    }));
  }
  return entry;
}

export async function getStockConsumptionEntries(
  projectId?: string
): Promise<(StockConsumptionEntry & { lineItems?: StockConsumptionLineItem[] })[]> {
  const params = projectId ? { project_id: projectId } : {};
  const { data } = await api.get<{ data: StockConsumptionEntryFromApi[] }>(
    '/stock-consumption-entries',
    { params }
  );
  return data.data.map(toStockConsumptionEntry);
}

export interface CreateStockConsumptionEntryPayload {
  projectId: string;
  remarks?: string;
  lineItems: Array<{
    consumableItemId: string;
    quantity: number;
  }>;
}

export async function createStockConsumptionEntry(
  payload: CreateStockConsumptionEntryPayload
): Promise<StockConsumptionEntry & { lineItems?: StockConsumptionLineItem[] }> {
  const { data } = await api.post<{ data: StockConsumptionEntryFromApi }>(
    '/stock-consumption-entries',
    {
      project_id: payload.projectId,
      remarks: payload.remarks ?? null,
      line_items: payload.lineItems.map((l) => ({
        consumable_item_id: l.consumableItemId,
        quantity: l.quantity,
      })),
    }
  );
  return toStockConsumptionEntry(data.data);
}

export interface UpdateStockConsumptionEntryPayload {
  remarks?: string;
  lineItems: Array<{
    consumableItemId: string;
    quantity: number;
  }>;
}

export async function updateStockConsumptionEntry(
  id: string,
  payload: UpdateStockConsumptionEntryPayload
): Promise<StockConsumptionEntry & { lineItems?: StockConsumptionLineItem[] }> {
  const { data } = await api.put<{ data: StockConsumptionEntryFromApi }>(
    `/stock-consumption-entries/${id}`,
    {
      remarks: payload.remarks ?? null,
      line_items: payload.lineItems.map((l) => ({
        consumable_item_id: l.consumableItemId,
        quantity: l.quantity,
      })),
    }
  );
  return toStockConsumptionEntry(data.data);
}

export async function deleteStockConsumptionEntry(id: string): Promise<void> {
  await api.delete(`/stock-consumption-entries/${id}`);
}
