/**
 * Audit logs API service - fetch audit log entries
 */

import { api } from "./api";

export interface ApiAuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  module: string;
  description: string;
  oldValue?: string;
  newValue?: string;
}

export interface ListAuditLogsParams {
  module?: string;
  action?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
  skip?: number;
}

export interface ListAuditLogsResponse {
  logs: ApiAuditLog[];
  total: number;
}

export async function listAuditLogs(params?: ListAuditLogsParams): Promise<ListAuditLogsResponse> {
  const sp = new URLSearchParams();
  if (params?.module) sp.set("module", params.module);
  if (params?.action) sp.set("action", params.action);
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.pageSize != null) sp.set("pageSize", String(params.pageSize));
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.skip != null) sp.set("skip", String(params.skip));
  const q = sp.toString();
  return api<ListAuditLogsResponse>(`/api/audit-logs${q ? `?${q}` : ""}`);
}
