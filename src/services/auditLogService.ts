import { api } from './api';
import type { AuditLog } from '@/types';

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  targetType?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface AuditLogsResponse {
  data: AuditLogFromApi[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface AuditLogFromApi {
  id: string;
  userId: string | null;
  userName: string;
  action: string;
  targetType?: string | null;
  targetId?: number | null;
  module: string | null;
  details: string | null;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  timestamp: string;
  ipAddress?: string;
}

export interface AuditLogStats {
  total: number;
  create: number;
  update: number;
  delete: number;
  login: number;
  logout: number;
}

function toAuditLog(log: AuditLogFromApi): AuditLog {
  return {
    id: log.id,
    userId: log.userId ?? '',
    userName: log.userName,
    action: log.action as AuditLog['action'],
    targetType: log.targetType ?? null,
    targetId: log.targetId ?? null,
    module: log.module ?? '',
    details: log.details ?? '',
    beforeData: log.beforeData,
    afterData: log.afterData,
    timestamp: new Date(log.timestamp),
  };
}

export async function getAuditLogs(filters?: AuditLogFilters): Promise<{
  logs: AuditLog[];
  meta: AuditLogsResponse['meta'];
}> {
  const params = new URLSearchParams();
  if (filters?.userId) params.set('user_id', filters.userId);
  if (filters?.action) params.set('action', filters.action);
  if (filters?.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters?.dateTo) params.set('date_to', filters.dateTo);
  if (filters?.targetType) params.set('target_type', filters.targetType);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page != null) params.set('page', String(filters.page));
  if (filters?.per_page) params.set('per_page', String(filters.per_page));

  const { data } = await api.get<AuditLogsResponse>(`/audit-logs?${params.toString()}`);
  return {
    logs: data.data.map(toAuditLog),
    meta: data.meta,
  };
}

export async function getAuditLogStats(filters?: { dateFrom?: string; dateTo?: string }): Promise<AuditLogStats> {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters?.dateTo) params.set('date_to', filters.dateTo);

  const { data } = await api.get<AuditLogStats>(`/audit-logs/stats?${params.toString()}`);
  return data;
}

export interface AuditLogFilterOptions {
  users: { id: string; name: string; email: string }[];
  targetTypes: string[];
}

export async function getAuditLogFilterOptions(): Promise<AuditLogFilterOptions> {
  const { data } = await api.get<AuditLogFilterOptions>('/audit-logs/filter-options');
  return data;
}
