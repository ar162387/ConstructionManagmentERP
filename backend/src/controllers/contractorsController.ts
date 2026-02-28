import { Response } from "express";
import {
  listContractors,
  getContractorById,
  createContractor,
  updateContractor,
  deleteContractor,
  type CreateContractorInput,
  type UpdateContractorInput,
} from "../services/contractorService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function list(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const items = await listContractors(
      { userId: actor.userId, role: actor.role },
      projectId
    );
    res.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list contractors";
    res.status(500).json({ error: message });
  }
}

export async function getOne(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const contractor = await getContractorById(id);
    if (!contractor) {
      res.status(404).json({ error: "Contractor not found" });
      return;
    }
    res.json(contractor);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get contractor";
    res.status(500).json({ error: message });
  }
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const input = req.body as CreateContractorInput;
    const contractor = await createContractor(
      { userId: actor.userId, email: actor.email, role: actor.role },
      input
    );
    res.status(201).json(contractor);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create contractor";
    const status = message.includes("required") ? 400 : 500;
    res.status(status).json({ error: message });
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { id } = req.params;
    const input = req.body as UpdateContractorInput;
    const contractor = await updateContractor(
      { userId: actor.userId, email: actor.email, role: actor.role },
      id,
      input
    );
    res.json(contractor);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update contractor";
    const status =
      message === "Contractor not found" ? 404
        : message.includes("required") ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}

export async function remove(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { id } = req.params;
    await deleteContractor({ userId: actor.userId, email: actor.email, role: actor.role }, id);
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete contractor";
    const status =
      message === "Contractor not found" ? 404
        : message.includes("Cannot delete") ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}
