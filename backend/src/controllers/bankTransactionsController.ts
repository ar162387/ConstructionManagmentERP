import { Response } from "express";
import {
  listBankTransactions,
  createBankTransaction,
  updateBankTransaction,
  deleteBankTransaction,
  type CreateBankTransactionInput,
  type UpdateBankTransactionInput,
  type ListBankTransactionsOptions,
} from "../services/bankTransactionService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function list(req: AuthRequest, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 12;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;

    const options: ListBankTransactionsOptions = {
      page,
      pageSize,
      search,
      startDate,
      endDate,
    };
    const result = await listBankTransactions(options);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list transactions";
    res.status(500).json({ error: message });
  }
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const input = req.body as CreateBankTransactionInput;
    const tx = await createBankTransaction(
      { userId: actor.userId, email: actor.email, role: actor.role },
      input
    );
    res.status(201).json(tx);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create transaction";
    const status =
      message.includes("required") ||
      message.includes("Invalid") ||
      message.includes("Insufficient") ||
      message.includes("not found")
        ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { id } = req.params;
    const input = req.body as UpdateBankTransactionInput;
    const tx = await updateBankTransaction(
      { userId: actor.userId, email: actor.email, role: actor.role },
      id,
      input
    );
    res.json(tx);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update transaction";
    const status =
      message === "Transaction not found" ? 404
        : message.includes("required") ||
          message.includes("Invalid") ||
          message.includes("Insufficient") ||
          message.includes("not found")
        ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}

export async function remove(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { id } = req.params;
    await deleteBankTransaction({ userId: actor.userId, email: actor.email, role: actor.role }, id);
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete transaction";
    const status =
      message === "Transaction not found" ? 404
        : message.includes("Cannot delete") ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}
