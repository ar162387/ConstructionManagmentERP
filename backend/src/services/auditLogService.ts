import { AuditLog } from "../models/AuditLog.js";

export interface AuditLogListParams {
  module?: string;
  action?: string;
  page?: number;
  limit?: number;
  skip?: number;
}

export interface AuditLogItem {
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

export interface AuditLogListResult {
  logs: AuditLogItem[];
  total: number;
}

const actionDisplay: Record<string, string> = {
  create: "Create",
  update: "Edit",
  delete: "Delete",
};

const DEFAULT_PAGE_SIZE = 12;

export async function listAuditLogs(params: AuditLogListParams): Promise<AuditLogListResult> {
  const pageSize = Math.min(Math.max(1, params.limit ?? DEFAULT_PAGE_SIZE), 500);
  const page = params.page !== undefined ? Math.max(1, Number(params.page)) : undefined;
  const skip = params.skip !== undefined
    ? Number(params.skip)
    : page !== undefined
      ? (page - 1) * pageSize
      : 0;
  const limit = params.limit !== undefined ? Math.min(Number(params.limit), 500) : pageSize;

  const filter: Record<string, unknown> = {};
  if (params.module && params.module !== "all") filter.module = params.module;
  if (params.action && params.action !== "all") filter.action = params.action;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  const list: AuditLogItem[] = logs.map((l) => ({
    id: l._id.toString(),
    timestamp: l.timestamp instanceof Date ? l.timestamp.toISOString().replace("T", " ").slice(0, 19) : String(l.timestamp),
    user: l.userName,
    role: l.role,
    action: actionDisplay[l.action] ?? l.action,
    module: l.module,
    description: l.description,
    oldValue: l.oldValue,
    newValue: l.newValue,
  }));

  return { logs: list, total };
}
