import { api } from "./api";

export interface ApiConsumableUnit { id: string; name: string; }

export const listConsumableUnits = () => api<ApiConsumableUnit[]>("/api/consumable-units");
export const createConsumableUnit = (input: { name: string }) =>
  api<ApiConsumableUnit>("/api/consumable-units", { method: "POST", body: JSON.stringify(input) });
