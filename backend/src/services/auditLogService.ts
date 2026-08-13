import { AuditLog } from "../models/AuditLog.js";
import { startOfDayPKT, endOfDayPKT } from "../lib/pktDate.js";

export interface AuditLogListParams {
  module?: string;
  action?: string;
  userId?: string;
  projectId?: string;
  /** "YYYY-MM-DD" in Pakistan local time — inclusive. */
  startDate?: string;
  /** "YYYY-MM-DD" in Pakistan local time — inclusive. */
  endDate?: string;
  /** Free-text match against description, entity ID, and user name. */
  search?: string;
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
  entityId?: string;
  projectId?: string;
  projectName?: string;
  description: string;
  oldValue?: string;
  newValue?: string;
}

export interface AuditLogListResult {
  logs: AuditLogItem[];
  total: number;
}

export interface AuditLogFilterOptions {
  modules: string[];
  users: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}

const actionDisplay: Record<string, string> = {
  create: "Create",
  update: "Edit",
  delete: "Delete",
};

const DEFAULT_PAGE_SIZE = 12;

/**
 * Format a stored UTC timestamp as "YYYY-MM-DD HH:mm:ss" in Pakistan time (Asia/Karachi,
 * UTC+5, no DST). Timestamps are stored in UTC (the correct way to store them) but were
 * previously displayed via `.toISOString()`, which is 5 hours behind local Pakistan time.
 */
function formatTimestampPKT(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function buildFilter(params: AuditLogListParams): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (params.module && params.module !== "all") filter.module = params.module;
  if (params.action && params.action !== "all") filter.action = params.action;
  if (params.userId && params.userId !== "all") filter.userId = params.userId;
  if (params.projectId && params.projectId !== "all") filter.projectId = params.projectId;

  if (params.startDate || params.endDate) {
    const range: Record<string, Date> = {};
    if (params.startDate) range.$gte = startOfDayPKT(params.startDate);
    if (params.endDate) range.$lte = endOfDayPKT(params.endDate);
    filter.timestamp = range;
  }

  if (params.search?.trim()) {
    const term = params.search.trim();
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ description: re }, { entityId: re }, { userName: re }, { projectName: re }];
  }

  return filter;
}

export async function listAuditLogs(params: AuditLogListParams): Promise<AuditLogListResult> {
  const pageSize = Math.min(Math.max(1, params.limit ?? DEFAULT_PAGE_SIZE), 500);
  const page = params.page !== undefined ? Math.max(1, Number(params.page)) : undefined;
  const skip = params.skip !== undefined
    ? Number(params.skip)
    : page !== undefined
      ? (page - 1) * pageSize
      : 0;
  const limit = params.limit !== undefined ? Math.min(Number(params.limit), 500) : pageSize;

  const filter = buildFilter(params);

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  const list: AuditLogItem[] = logs.map((l) => ({
    id: l._id.toString(),
    timestamp: l.timestamp instanceof Date ? formatTimestampPKT(l.timestamp) : String(l.timestamp),
    user: l.userName,
    role: l.role,
    action: actionDisplay[l.action] ?? l.action,
    module: l.module,
    entityId: l.entityId,
    projectId: l.projectId,
    projectName: l.projectName,
    description: l.description,
    oldValue: l.oldValue,
    newValue: l.newValue,
  }));

  return { logs: list, total };
}

/** Distinct values across ALL audit logs (not just the current page) to populate filter dropdowns. */
export async function getAuditLogFilterOptions(): Promise<AuditLogFilterOptions> {
  const [modules, userRows, projectRows] = await Promise.all([
    AuditLog.distinct("module") as Promise<string[]>,
    AuditLog.aggregate<{ _id: string; name: string }>([
      { $match: { userId: { $ne: null } } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: "$userId", name: { $first: "$userName" } } },
    ]),
    AuditLog.aggregate<{ _id: string; name: string }>([
      { $match: { projectId: { $ne: null } } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: "$projectId", name: { $first: "$projectName" } } },
    ]),
  ]);

  return {
    modules: modules.filter(Boolean).sort(),
    users: userRows
      .map((u) => ({ id: u._id, name: u.name || u._id }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    projects: projectRows
      .map((p) => ({ id: p._id, name: p.name || p._id }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
