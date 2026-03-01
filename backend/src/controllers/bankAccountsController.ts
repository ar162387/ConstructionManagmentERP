import { Response } from "express";
import {
  listBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  type CreateBankAccountInput,
  type UpdateBankAccountInput,
} from "../services/bankAccountService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function list(req: AuthRequest, res: Response) {
  try {
    const accounts = await listBankAccounts();
    res.json(accounts);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list bank accounts";
    res.status(500).json({ error: message });
  }
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const input = req.body as CreateBankAccountInput;
    const account = await createBankAccount(
      { userId: actor.userId, email: actor.email, role: actor.role },
      input
    );
    res.status(201).json(account);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create bank account";
    const status = message.includes("required") || message.includes("Invalid") ? 400 : 500;
    res.status(status).json({ error: message });
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { id } = req.params;
    const input = req.body as UpdateBankAccountInput;
    const account = await updateBankAccount(
      { userId: actor.userId, email: actor.email, role: actor.role },
      id,
      input
    );
    res.json(account);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update bank account";
    const status =
      message === "Account not found" ? 404
        : message.includes("required") || message.includes("Invalid") ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}

export async function remove(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { id } = req.params;
    await deleteBankAccount({ userId: actor.userId, email: actor.email, role: actor.role }, id);
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete bank account";
    const status =
      message === "Account not found" ? 404
        : message.includes("Cannot delete") ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}
