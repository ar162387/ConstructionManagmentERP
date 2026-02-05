import { api } from './api';
import type { ReceivingEntry, ReceivingEntryLineItem } from '@/types';

export interface ReceivingEntryFromApi {
  id: string;
  remarks: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  lineItems: {
    id: string;
    nonConsumableItemId: string;
    quantity: number;
    unitCost: number;
    lineTotal: number;
    nonConsumableItem?: { id: string; name: string };
  }[];
  totalValue: number;
}

function toReceivingEntry(e: ReceivingEntryFromApi): ReceivingEntry {
  return {
    id: e.id,
    remarks: e.remarks,
    createdBy: e.createdBy,
    createdAt: e.createdAt,
    totalValue: e.totalValue,
    lineItems: e.lineItems.map((line) => ({
      id: line.id,
      nonConsumableItemId: line.nonConsumableItemId,
      quantity: line.quantity,
      unitCost: line.unitCost,
      lineTotal: line.lineTotal,
      nonConsumableItem: line.nonConsumableItem,
    })),
  };
}

export async function getReceivingEntries(): Promise<ReceivingEntry[]> {
  const { data } = await api.get<{ data: ReceivingEntryFromApi[] }>('/receiving-entries');
  return data.data.map(toReceivingEntry);
}

export async function getReceivingEntry(id: string): Promise<ReceivingEntry> {
  const { data } = await api.get<{ data: ReceivingEntryFromApi }>(`/receiving-entries/${id}`);
  return toReceivingEntry(data.data);
}

export interface ReceivingEntryLineItemPayload {
  nonConsumableItemId: string;
  quantity: number;
  unitCost?: number;
  lineTotal?: number;
}

export interface CreateReceivingEntryPayload {
  remarks?: string;
  lineItems: ReceivingEntryLineItemPayload[];
}

export async function createReceivingEntry(
  payload: CreateReceivingEntryPayload
): Promise<ReceivingEntry> {
  const lineItems = payload.lineItems.map((line) => {
    const quantity = line.quantity;
    const hasUnitCost = line.unitCost != null && line.unitCost !== '';
    const body: Record<string, unknown> = {
      non_consumable_item_id: line.nonConsumableItemId,
      quantity,
    };
    if (hasUnitCost) {
      body.unit_cost = Number(line.unitCost);
    } else if (line.lineTotal != null && line.lineTotal !== '') {
      body.line_total = Number(line.lineTotal);
    }
    return body;
  });
  const { data } = await api.post<{ data: ReceivingEntryFromApi }>('/receiving-entries', {
    remarks: payload.remarks ?? null,
    line_items: lineItems,
  });
  return toReceivingEntry(data.data);
}

export async function deleteReceivingEntry(id: string): Promise<void> {
  await api.delete(`/receiving-entries/${id}`);
}
