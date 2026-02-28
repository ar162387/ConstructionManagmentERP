import { Response } from "express";
import {
  listNonConsumableCategories,
  createNonConsumableCategory,
  type CreateNonConsumableCategoryInput,
} from "../services/nonConsumableCategoryService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function list(req: AuthRequest, res: Response) {
  try {
    const categories = await listNonConsumableCategories();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to list categories" });
  }
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const category = await createNonConsumableCategory(req.body as CreateNonConsumableCategoryInput);
    res.status(201).json(category);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create category";
    const status = msg.includes("required") || msg.includes("already exists") ? 400 : 500;
    res.status(status).json({ error: msg });
  }
}
