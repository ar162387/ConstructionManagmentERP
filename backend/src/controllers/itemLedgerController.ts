import { Response } from "express";
import {
  listItemLedger,
  createItemLedgerEntry,
  updateItemLedgerEntry,
  deleteItemLedgerEntry,
  type CreateItemLedgerInput,
  type UpdateItemLedgerInput,
} from "../services/itemLedgerService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function list(req: AuthRequest, res: Response) {
  try {
    const { itemId } = req.params;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const result = await listItemLedger(itemId, { page, pageSize });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to list ledger" });
  }
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { itemId } = req.params;
    const entry = await createItemLedgerEntry(
      { userId: actor.userId, email: actor.email, role: actor.role },
      { ...req.body, itemId } as CreateItemLedgerInput
    );
    res.status(201).json(entry);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create ledger entry";
    const status =
      msg.includes("required") || msg.includes("exceed") || msg.includes("not found") || msg.includes("Invalid") ? 400 : 500;
    res.status(status).json({ error: msg });
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const entry = await updateItemLedgerEntry(
      { userId: actor.userId, email: actor.email, role: actor.role },
      req.params.id,
      req.body as UpdateItemLedgerInput
    );
    res.json(entry);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update ledger entry";
    const status = msg.includes("not found") ? 404 : msg.includes("exceed") || msg.includes("Invalid") ? 400 : 500;
    res.status(status).json({ error: msg });
  }
}

export async function remove(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    await deleteItemLedgerEntry(
      { userId: actor.userId, email: actor.email, role: actor.role },
      req.params.id
    );
    res.status(204).send();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete ledger entry";
    const status =
      msg.includes("not found") ? 404
      : msg.includes("Cannot delete") || msg.includes("stock negative") ? 400
      : 500;
    res.status(status).json({ error: msg });
  }
}
