import { Response } from "express";
import { listAuditLogs, getAuditLogFilterOptions } from "../services/auditLogService.js";
import type { AuthRequest } from "../middleware/auth.js";

function requireSuperAdmin(req: AuthRequest, res: Response): boolean {
  const { user } = req;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  if (user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden: Audit logs access is Super Admin only" });
    return false;
  }
  return true;
}

export async function list(req: AuthRequest, res: Response) {
  try {
    if (!requireSuperAdmin(req, res)) return;

    const moduleFilter = req.query.module as string | undefined;
    const actionFilter = req.query.action as string | undefined;
    const userId = req.query.userId as string | undefined;
    const projectId = req.query.projectId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const search = req.query.search as string | undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.pageSize ? Number(req.query.pageSize) : req.query.limit ? Number(req.query.limit) : undefined;
    const skip = req.query.skip ? Number(req.query.skip) : undefined;

    const result = await listAuditLogs({
      module: moduleFilter,
      action: actionFilter,
      userId,
      projectId,
      startDate,
      endDate,
      search,
      page,
      limit,
      skip,
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch audit logs";
    res.status(500).json({ error: message });
  }
}

export async function filterOptions(req: AuthRequest, res: Response) {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const result = await getAuditLogFilterOptions();
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch audit log filter options";
    res.status(500).json({ error: message });
  }
}
