import { Response } from "express";
import { createConsumableUnit, listConsumableUnits } from "../services/consumableUnitService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function list(_req: AuthRequest, res: Response) {
  try { res.json(await listConsumableUnits()); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : "Failed to list units" }); }
}

export async function create(req: AuthRequest, res: Response) {
  try { res.status(201).json(await createConsumableUnit(req.body)); }
  catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create unit" }); }
}
