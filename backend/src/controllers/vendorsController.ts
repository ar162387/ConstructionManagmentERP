import { Response } from "express";
import {
  listVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  type CreateVendorInput,
  type UpdateVendorInput,
} from "../services/vendorService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function list(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const items = await listVendors(
      { userId: actor.userId, role: actor.role },
      projectId
    );
    res.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list vendors";
    res.status(500).json({ error: message });
  }
}

export async function getOne(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const vendor = await getVendorById(id);
    if (!vendor) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    res.json(vendor);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get vendor";
    res.status(500).json({ error: message });
  }
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const input = req.body as CreateVendorInput;
    const vendor = await createVendor(
      { userId: actor.userId, email: actor.email, role: actor.role },
      input
    );
    res.status(201).json(vendor);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create vendor";
    const status = message.includes("required") ? 400 : 500;
    res.status(status).json({ error: message });
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { id } = req.params;
    const input = req.body as UpdateVendorInput;
    const vendor = await updateVendor(
      { userId: actor.userId, email: actor.email, role: actor.role },
      id,
      input
    );
    res.json(vendor);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update vendor";
    const status =
      message === "Vendor not found" ? 404
        : message.includes("required") ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}

export async function remove(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { id } = req.params;
    await deleteVendor({ userId: actor.userId, email: actor.email, role: actor.role }, id);
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete vendor";
    const status =
      message === "Vendor not found" ? 404
        : message.includes("Cannot delete") ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}
