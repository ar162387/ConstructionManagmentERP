import { Response } from "express";
import { createClient, getClientLedger, listClients, updateClient } from "../services/clientService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function list(_req: AuthRequest, res: Response) { try { res.json(await listClients()); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : "Failed to list clients" }); } }
export async function create(req: AuthRequest, res: Response) { try { const actor = req.user!; res.status(201).json(await createClient({ userId: actor.userId, email: actor.email, role: actor.role }, req.body?.name)); } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create client" }); } }
export async function update(req: AuthRequest, res: Response) { try { const actor = req.user!; res.json(await updateClient({ userId: actor.userId, email: actor.email, role: actor.role }, req.params.id, req.body?.name)); } catch (err) { const message = err instanceof Error ? err.message : "Failed to update client"; res.status(message === "Client not found" ? 404 : 400).json({ error: message }); } }
export async function ledger(req: AuthRequest, res: Response) { try { res.json(await getClientLedger(req.params.id, typeof req.query.projectId === "string" ? req.query.projectId : undefined)); } catch (err) { const message = err instanceof Error ? err.message : "Failed to get client ledger"; res.status(message.includes("not found") ? 404 : 400).json({ error: message }); } }
