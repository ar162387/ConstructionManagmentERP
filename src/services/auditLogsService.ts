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
  entityId?: string;
  projectId?: string;
  projectName?: string;
  description: string;
  oldValue?: string;
  newValue?: string;
}

export interface ListAuditLogsParams {
  module?: string;
  action?: string;
  userId?: string;
  projectId?: string;
  /** "YYYY-MM-DD", inclusive, in Pakistan local time. */
  startDate?: string;
  /** "YYYY-MM-DD", inclusive, in Pakistan local time. */
  endDate?: string;
  /** Free-text match against description, entity ID, user name, and project name. */
  search?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
  skip?: number;
}

export interface ListAuditLogsResponse {
  logs: ApiAuditLog[];
  total: number;
}

export interface AuditLogFilterOptions {
  modules: string[];
  users: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}

export async function listAuditLogs(params?: ListAuditLogsParams): Promise<ListAuditLogsResponse> {
  const sp = new URLSearchParams();
  if (params?.module) sp.set("module", params.module);
  if (params?.action) sp.set("action", params.action);
  if (params?.userId) sp.set("userId", params.userId);
  if (params?.projectId) sp.set("projectId", params.projectId);
  if (params?.startDate) sp.set("startDate", params.startDate);
  if (params?.endDate) sp.set("endDate", params.endDate);
  if (params?.search) sp.set("search", params.search);
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.pageSize != null) sp.set("pageSize", String(params.pageSize));
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.skip != null) sp.set("skip", String(params.skip));
  const q = sp.toString();
  return api<ListAuditLogsResponse>(`/api/audit-logs${q ? `?${q}` : ""}`);
}

export async function getAuditLogFilterOptions(): Promise<AuditLogFilterOptions> {
  return api<AuditLogFilterOptions>("/api/audit-logs/filter-options");
}
