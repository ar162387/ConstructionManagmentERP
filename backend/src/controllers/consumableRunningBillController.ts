import { Response } from "express";
import { getConsumableRunningBill } from "../services/consumableRunningBillService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function getRunningBill(req: AuthRequest, res: Response) {
  try {
    const result = await getConsumableRunningBill(
      { userId: req.user!.userId, role: req.user!.role },
      {
        projectId: typeof req.query.projectId === "string" ? req.query.projectId : undefined,
        vendorId: typeof req.query.vendorId === "string" ? req.query.vendorId : "",
        periodStart: typeof req.query.periodStart === "string" ? req.query.periodStart : "",
        periodEnd: typeof req.query.periodEnd === "string" ? req.query.periodEnd : "",
      }
    );
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate consumable bill";
    res.status(message.includes("required") || message.includes("date") || message.includes("Dates") || message.includes("before") || message.includes("not found") ? 400 : 500).json({ error: message });
  }
}
