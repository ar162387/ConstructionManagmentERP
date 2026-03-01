import { Response } from "express";
import {
  getProjectLedger,
  createProjectBalanceAdjustment,
  updateProjectBalanceAdjustment,
  deleteProjectBalanceAdjustment,
  type CreateProjectBalanceAdjustmentInput,
  type UpdateProjectBalanceAdjustmentInput,
} from "../services/projectLedgerService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function getLedger(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { projectId } = req.params;
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 12;

    const result = await getProjectLedger(actor, projectId, { page, pageSize });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get project ledger";
    res.status(500).json({ error: message });
  }
}

export async function createBalanceAdjustment(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { projectId } = req.params;
    const input = req.body as CreateProjectBalanceAdjustmentInput;
    const result = await createProjectBalanceAdjustment(
      { userId: actor.userId, email: actor.email, role: actor.role },
      projectId,
      input
    );
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create balance adjustment";
    const status =
      message.includes("required") ||
      message.includes("Invalid") ||
      message.includes("Cannot") ||
      message.includes("not found")
        ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}

export async function updateBalanceAdjustment(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { projectId, id } = req.params;
    const input = req.body as UpdateProjectBalanceAdjustmentInput;
    const result = await updateProjectBalanceAdjustment(
      { userId: actor.userId, email: actor.email, role: actor.role },
      projectId,
      id,
      input
    );
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update balance adjustment";
    const status =
      message === "Adjustment not found" ? 404
        : message.includes("required") ||
          message.includes("Invalid") ||
          message.includes("Cannot") ||
          message.includes("not found")
        ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}

export async function deleteBalanceAdjustment(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { projectId, id } = req.params;
    await deleteProjectBalanceAdjustment(
      { userId: actor.userId, email: actor.email, role: actor.role },
      projectId,
      id
    );
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete balance adjustment";
    const status =
      message === "Adjustment not found" ? 404
        : message.includes("Cannot") ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}
