import { Response } from "express";
import {
  createVendorPayment,
  deleteVendorPayment,
  getVendorLedger,
  type CreateVendorPaymentInput,
} from "../services/vendorPaymentService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function getVendorLedgerHandler(req: AuthRequest, res: Response) {
  try {
    const { vendorId } = req.params;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const data = await getVendorLedger(vendorId, { page, pageSize });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to get vendor ledger" });
  }
}

export async function createPayment(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { vendorId } = req.params;
    const payment = await createVendorPayment(
      { userId: actor.userId, email: actor.email, role: actor.role },
      vendorId,
      req.body as CreateVendorPaymentInput
    );
    res.status(201).json(payment);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to record payment";
    const status =
      msg.includes("required") || msg.includes("exceeds") || msg.includes("positive") ? 400
        : msg.includes("not found") ? 404
        : 500;
    res.status(status).json({ error: msg });
  }
}

export async function deletePayment(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    await deleteVendorPayment(
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
