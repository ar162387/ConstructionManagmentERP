import { Response } from "express";
import {
  getEmployeeLedger,
  getEmployeeLedgerSnapshot,
  createEmployeePayment,
  updateEmployeePayment,
  deleteEmployeePayment,
  getAttendance,
  putAttendance,
  type CreateEmployeePaymentInput,
  type UpdateEmployeePaymentInput,
  type PutAttendanceInput,
} from "../services/employeeLedgerService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function getLedger(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { employeeId } = req.params;
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const data = await getEmployeeLedger(
      { userId: actor.userId, role: actor.role },
      employeeId,
      { month, page, pageSize }
    );
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get employee ledger";
    res.status(500).json({ error: message });
  }
}

export async function getLedgerSnapshot(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { employeeId } = req.params;
    const month = typeof req.query.month === "string" ? req.query.month : "";
    if (!month.trim()) {
      res.status(400).json({ error: "month query is required" });
      return;
    }
    const data = await getEmployeeLedgerSnapshot(
      { userId: actor.userId, role: actor.role },
      employeeId,
      month
    );
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get ledger snapshot";
    res.status(500).json({ error: message });
  }
}

export async function createPayment(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { employeeId } = req.params;
    const payment = await createEmployeePayment(
      { userId: actor.userId, email: actor.email, role: actor.role },
      employeeId,
      req.body as CreateEmployeePaymentInput
    );
    res.status(201).json(payment);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record payment";
    const status =
      message.includes("required") || message.includes("exceeds") || message.includes("Amount") || message.includes("Invalid") ? 400
        : message.includes("not found") ? 404
        : 500;
    res.status(status).json({ error: message });
  }
}

export async function updatePayment(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { paymentId } = req.params;
    const payment = await updateEmployeePayment(
      { userId: actor.userId, email: actor.email, role: actor.role },
      paymentId,
      req.body as UpdateEmployeePaymentInput
    );
    res.json(payment);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update payment";
    const status =
      message.includes("required") || message.includes("exceeds") || message.includes("Amount") || message.includes("Invalid") ? 400
        : message.includes("not found") ? 404
        : 500;
    res.status(status).json({ error: message });
  }
}

export async function deletePayment(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { paymentId } = req.params;
    await deleteEmployeePayment(
      { userId: actor.userId, email: actor.email, role: actor.role },
      paymentId
    );
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete payment";
    const status = message.includes("not found") ? 404 : 500;
    res.status(status).json({ error: message });
  }
}

export async function getAttendanceHandler(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { employeeId } = req.params;
    const month = typeof req.query.month === "string" ? req.query.month : "";
    if (!month) {
      res.status(400).json({ error: "month query is required" });
      return;
    }
    const data = await getAttendance({ userId: actor.userId, role: actor.role }, employeeId, month);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get attendance";
    res.status(500).json({ error: message });
  }
}

export async function putAttendanceHandler(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { employeeId } = req.params;
    const data = await putAttendance(
      { userId: actor.userId, email: actor.email, role: actor.role },
      employeeId,
      req.body as PutAttendanceInput
    );
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save attendance";
    const status = message.includes("required") ? 400 : 500;
    res.status(status).json({ error: message });
  }
}
