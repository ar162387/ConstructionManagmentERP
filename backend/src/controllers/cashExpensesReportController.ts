import { Response } from "express";
import { getCashExpensesReport } from "../services/cashExpensesReportService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function getReport(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { projectId } = req.params;
    const date = typeof req.query.date === "string" ? req.query.date.trim() : "";

    if (!date) {
      res.status(400).json({ error: "Query parameter date is required (YYYY-MM-DD)" });
      return;
    }

    const result = await getCashExpensesReport(actor, projectId, date);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get cash & expenses report";
    const status =
      message.includes("not found") || message.includes("access denied")
        ? 404
        : message.includes("Invalid") || message.includes("required")
        ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}
