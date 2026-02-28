import { Response } from "express";
import { listAuditLogs } from "../services/auditLogService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function list(req: AuthRequest, res: Response) {
  try {
    const { user } = req;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (user.role !== "super_admin") {
      res.status(403).json({ error: "Forbidden: Audit logs access is Super Admin only" });
      return;
    }

    const moduleFilter = req.query.module as string | undefined;
    const actionFilter = req.query.action as string | undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.pageSize ? Number(req.query.pageSize) : req.query.limit ? Number(req.query.limit) : undefined;
    const skip = req.query.skip ? Number(req.query.skip) : undefined;

    const result = await listAuditLogs({
      module: moduleFilter,
      action: actionFilter,
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
