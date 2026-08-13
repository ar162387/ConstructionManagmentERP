import { AuditLog } from "../models/AuditLog.js";
import type { AuditAction } from "../models/AuditLog.js";
import { Project } from "../models/Project.js";

/** Look up a project's name for audit-log display/filtering. Returns undefined if not found. */
export async function getProjectName(projectId: string | undefined): Promise<string | undefined> {
  if (!projectId) return undefined;
  const project = await Project.findById(projectId).select("name").lean();
  return project?.name;
}

export interface LogAuditParams {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  action: AuditAction;
  module: string;
  entityId?: string;
  projectId?: string;
  projectName?: string;
  description: string;
  oldValue?: object;
  newValue?: object;
  metadata?: Record<string, unknown>;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  const doc = {
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    role: params.role,
    action: params.action,
    module: params.module,
    entityId: params.entityId,
    projectId: params.projectId,
    projectName: params.projectName,
    description: params.description,
    oldValue: params.oldValue != null ? JSON.stringify(params.oldValue) : undefined,
    newValue: params.newValue != null ? JSON.stringify(params.newValue) : undefined,
    metadata: params.metadata,
  };
  await AuditLog.create(doc);
}
