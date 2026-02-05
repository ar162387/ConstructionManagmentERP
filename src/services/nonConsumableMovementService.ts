import { api } from './api';
import type { NonConsumableMovement, NonConsumableMovementType } from '@/types';

export interface NonConsumableMovementFromApi {
  id: string;
  nonConsumableItemId: string;
  movementType: string;
  quantity: number;
  projectId: string | null;
  cost: number | null;
  remarks: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  nonConsumableItem?: { id: string; name: string };
  project?: { id: string; name: string };
  undoneAt?: string | null;
  undoneBy?: { id: string; name: string } | null;
}

function toMovement(m: NonConsumableMovementFromApi): NonConsumableMovement {
  return {
    id: m.id,
    nonConsumableItemId: m.nonConsumableItemId,
    movementType: m.movementType as NonConsumableMovementType,
    quantity: m.quantity,
    projectId: m.projectId,
    cost: m.cost,
    remarks: m.remarks,
    createdBy: m.createdBy,
    createdAt: m.createdAt,
    nonConsumableItem: m.nonConsumableItem,
    project: m.project,
    undoneAt: m.undoneAt ?? null,
    undoneBy: m.undoneBy ?? null,
  };
}

export interface MovementFilters {
  projectId?: string;
  nonConsumableItemId?: string;
  movementType?: NonConsumableMovementType;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
}

export async function getNonConsumableMovements(
  filters: MovementFilters = {}
): Promise<NonConsumableMovement[]> {
  const params = new URLSearchParams();
  if (filters.projectId) params.set('project_id', filters.projectId);
  if (filters.nonConsumableItemId) params.set('non_consumable_item_id', filters.nonConsumableItemId);
  if (filters.movementType) params.set('movement_type', filters.movementType);
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  if (filters.userId) params.set('user_id', filters.userId);
  const { data } = await api.get<{ data: NonConsumableMovementFromApi[] }>(
    `/non-consumable-movements?${params.toString()}`
  );
  return data.data.map(toMovement);
}

export interface CreateMovementPayload {
  movementType: NonConsumableMovementType;
  nonConsumableItemId: string;
  quantity: number;
  projectId?: string | null;
  cost?: number | null;
  remarks?: string | null;
  idempotencyKey?: string | null;
}

export async function createNonConsumableMovement(
  payload: CreateMovementPayload
): Promise<NonConsumableMovement> {
  const { data } = await api.post<{ data: NonConsumableMovementFromApi }>(
    '/non-consumable-movements',
    {
      movement_type: payload.movementType,
      non_consumable_item_id: payload.nonConsumableItemId,
      quantity: payload.quantity,
      project_id: payload.projectId ?? null,
      cost: payload.cost ?? null,
      remarks: payload.remarks ?? null,
      idempotency_key: payload.idempotencyKey ?? null,
    }
  );
  return toMovement(data.data);
}

/** Repair movements (repair_damaged) with cost for expense reporting */
export async function getRepairExpenses(filters: {
  dateFrom?: string;
  dateTo?: string;
  nonConsumableItemId?: string;
} = {}): Promise<NonConsumableMovement[]> {
  const movements = await getNonConsumableMovements({
    ...filters,
    movementType: 'repair_damaged',
  });
  return movements.filter((m) => m.cost != null && m.cost > 0);
}
