import { Response } from "express";
import {
  listNonConsumableItems,
  getNonConsumableItemById,
  createNonConsumableItem,
  updateNonConsumableItem,
  deleteNonConsumableItem,
  type CreateNonConsumableItemInput,
  type UpdateNonConsumableItemInput,
} from "../services/nonConsumableItemService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function list(req: AuthRequest, res: Response) {
  try {
    const items = await listNonConsumableItems();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to list items" });
  }
}

export async function getOne(req: AuthRequest, res: Response) {
  try {
    const item = await getNonConsumableItemById(req.params.id);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to get item" });
  }
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const item = await createNonConsumableItem(
      { userId: actor.userId, email: actor.email, role: actor.role },
      req.body as CreateNonConsumableItemInput
    );
    res.status(201).json(item);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create item";
    const status = msg.includes("required") || msg.includes("already exists") ? 400 : 500;
    res.status(status).json({ error: msg });
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const item = await updateNonConsumableItem(
      { userId: actor.userId, email: actor.email, role: actor.role },
      req.params.id,
      req.body as UpdateNonConsumableItemInput
    );
    res.json(item);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update item";
    const status =
      msg === "Item not found" ? 404 : msg.includes("already exists") || msg.includes("empty") ? 400 : 500;
    res.status(status).json({ error: msg });
  }
}

export async function remove(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    await deleteNonConsumableItem(
      { userId: actor.userId, email: actor.email, role: actor.role },
      req.params.id
    );
    res.status(204).send();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete item";
    const status =
      msg === "Item not found" ? 404 : msg.includes("Cannot delete") ? 400 : 500;
    res.status(status).json({ error: msg });
  }
}
