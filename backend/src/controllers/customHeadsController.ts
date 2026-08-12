import { Response } from "express";
import { listCustomHeads } from "../services/customHeadService.js";
import type { AuthRequest } from "../middleware/auth.js";
export async function list(_req: AuthRequest, res: Response) { try { res.json(await listCustomHeads()); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : "Failed to list heads" }); } }
