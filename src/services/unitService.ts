import { api } from './api';
import type { Unit } from '@/types';

export interface UnitFromApi {
  id: string;
  name: string;
  symbol: string | null;
  createdAt: string;
}

function toUnit(u: UnitFromApi): Unit {
  return {
    id: u.id,
    name: u.name,
    symbol: u.symbol ?? '',
  };
}

export async function getUnits(): Promise<Unit[]> {
  const { data } = await api.get<{ data: UnitFromApi[] }>('/units');
  return data.data.map(toUnit);
}

export interface CreateUnitPayload {
  name: string;
  symbol?: string;
}

export async function createUnit(payload: CreateUnitPayload): Promise<Unit> {
  const { data } = await api.post<{ data: UnitFromApi }>('/units', {
    name: payload.name,
    symbol: payload.symbol ?? null,
  });
  return toUnit(data.data);
}

export interface UpdateUnitPayload {
  name?: string;
  symbol?: string;
}

export async function updateUnit(
  unitId: string,
  payload: UpdateUnitPayload
): Promise<Unit> {
  const { data } = await api.put<{ data: UnitFromApi }>(`/units/${unitId}`, {
    name: payload.name,
    symbol: payload.symbol ?? null,
  });
  return toUnit(data.data);
}

export async function deleteUnit(unitId: string): Promise<void> {
  await api.delete(`/units/${unitId}`);
}
