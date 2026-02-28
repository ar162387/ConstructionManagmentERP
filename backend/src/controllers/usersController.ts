import { Response } from "express";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  type CreateUserInput,
  type UpdateUserInput,
} from "../services/userService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function list(req: AuthRequest, res: Response) {
  try {
    const list = await listUsers();
    res.json(list);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list users";
    res.status(500).json({ error: message });
  }
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const input = req.body as CreateUserInput;
    if (!input.name || !input.email || !input.password || !input.role) {
      res.status(400).json({ error: "Name, email, password, and role are required" });
      return;
    }
    const user = await createUser(
      { userId: actor.userId, email: actor.email, role: actor.role },
      input
    );
    res.status(201).json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create user";
    const status = message.startsWith("You cannot") ? 403 : 400;
    res.status(status).json({ error: message });
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { id } = req.params;
    const input = req.body as UpdateUserInput;
    const user = await updateUser(
      { userId: actor.userId, email: actor.email, role: actor.role },
      id,
      input
    );
    res.json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update user";
    const status =
      message === "User not found" ? 404
        : message.includes("cannot") || message.includes("Invalid") ? 403
        : message.includes("already") ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}

export async function remove(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { id } = req.params;
    await deleteUser({ userId: actor.userId, email: actor.email, role: actor.role }, id);
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete user";
    const status =
      message === "User not found" ? 404
        : message.includes("cannot") || message.includes("Cannot delete yourself") ? 400
        : 403;
    res.status(status).json({ error: message });
  }
}
