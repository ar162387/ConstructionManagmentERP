import { Response } from "express";
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "../services/projectService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function list(req: AuthRequest, res: Response) {
  try {
    const actor = req.user;
    const list = actor
      ? await listProjects({ userId: actor.userId, role: actor.role })
      : await listProjects();
    res.json(list);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list projects";
    res.status(500).json({ error: message });
  }
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const input = req.body as CreateProjectInput;
    const project = await createProject(
      { userId: actor.userId, email: actor.email, role: actor.role },
      input
    );
    res.status(201).json(project);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create project";
    const status = message.includes("required") || message.includes("Invalid") ? 400 : 500;
    res.status(status).json({ error: message });
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { id } = req.params;
    const input = req.body as UpdateProjectInput;
    const project = await updateProject(
      { userId: actor.userId, email: actor.email, role: actor.role },
      id,
      input
    );
    res.json(project);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update project";
    const status =
      message === "Project not found" ? 404
        : message.includes("required") || message.includes("Invalid") ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}

export async function remove(req: AuthRequest, res: Response) {
  try {
    const actor = req.user!;
    const { id } = req.params;
    await deleteProject({ userId: actor.userId, email: actor.email, role: actor.role }, id);
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete project";
    const status =
      message === "Project not found" ? 404
        : message.includes("Cannot delete") ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}
