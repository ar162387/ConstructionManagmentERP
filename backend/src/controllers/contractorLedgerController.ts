import { Response } from "express";
import {
  getContractorLedger,
  createContractorEntry,
  createContractorPayment,
  deleteContractorEntry,
  deleteContractorPayment,
  type CreateContractorEntryInput,
  type CreateContractorPaymentInput,
} from "../services/contractorLedgerService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function getLedger(req: AuthRequest, res: Response) {
  try {
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    const contractorId = typeof req.query.contractorId === "string" ? req.query.contractorId : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;

    if (!projectId || !month) {
      res.status(400).json({ error: "projectId and month are required" });
      return;
    }

    const actor = req.user!;
    const data = await getContractorLedger(projectId, month, { contractorId, page, pageSize, actor });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to get contractor ledger" });
  }
}

export async function createEntry(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const input = req.body as CreateContractorEntryInput;
    const entry = await createContractorEntry(
      { userId: actor.userId, email: actor.email, role: actor.role },
      input
    );
    res.status(201).json(entry);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to add contractor entry";
    const status =
      msg.includes("required") || msg.includes("positive") || msg.includes("Invalid") ? 400
        : msg.includes("not found") ? 404
        : 500;
    res.status(status).json({ error: msg });
  }
}

export async function createPayment(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { contractorId } = req.params;
    const payment = await createContractorPayment(
      { userId: actor.userId, email: actor.email, role: actor.role },
      contractorId,
      req.body as CreateContractorPaymentInput
    );
    res.status(201).json(payment);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to record contractor payment";
    const status =
      msg.includes("required") || msg.includes("positive") || msg.includes("Invalid") || msg.includes("overpay") ? 400
        : msg.includes("not found") ? 404
        : 500;
    res.status(status).json({ error: msg });
  }
}

export async function deleteEntry(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    await deleteContractorEntry(
      { userId: actor.userId, email: actor.email, role: actor.role },
      req.params.entryId
    );
    res.status(204).send();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete entry";
    const status =
      msg.includes("not found") ? 404
        : msg.includes("overpay") ? 400
        : 500;
    res.status(status).json({ error: msg });
  }
}

export async function deletePayment(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    await deleteContractorPayment(
      { userId: actor.userId, email: actor.email, role: actor.role },
      req.params.paymentId
    );
    res.status(204).send();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete payment";
    const status = msg.includes("not found") ? 404 : 500;
    res.status(status).json({ error: msg });
  }
}
