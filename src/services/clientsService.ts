import { api } from "./api";
export interface ApiClient { id: string; name: string }
export interface ClientLedgerResult { clientName: string; rows: { id: string; date: string; description: string; payment: number; source: string; accountId: string; projectId?: string; projectName?: string; accountName: string; mode: "Cash" | "Bank" | "Online"; referenceId?: string; remarks?: string; balance: number }[] }
export const listClients = () => api<ApiClient[]>("/api/clients");
export const createClient = (name: string) => api<ApiClient>("/api/clients", { method: "POST", body: JSON.stringify({ name }) });
export const updateClient = (id: string, name: string) => api<ApiClient>(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
export const getClientLedger = (id: string, projectId?: string) => api<ClientLedgerResult>(`/api/clients/${id}/ledger${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`);
