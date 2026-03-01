import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";
import { ItemLedgerEntry } from "../models/ItemLedgerEntry.js";
import { NonConsumableLedgerEntry } from "../models/NonConsumableLedgerEntry.js";
import { ContractorEntry } from "../models/ContractorEntry.js";
import { logAudit } from "./auditService.js";
import { roleDisplay } from "./authService.js";
import type { AuthRequest } from "../middleware/auth.js";

export const statusDisplay: Record<string, string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
};

const statusToDb: Record<string, "active" | "on_hold" | "completed"> = {
  Active: "active",
  "On Hold": "on_hold",
  Completed: "completed",
};

export interface ProjectPayload {
  id: string;
  name: string;
  description: string;
  allocatedBudget: number;
  status: string;
  startDate: string;
  endDate: string;
  spent: number;
  balance: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  allocatedBudget: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  allocatedBudget?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

function toPayload(doc: { _id: mongoose.Types.ObjectId; name: string; description?: string; allocatedBudget: number; status: string; startDate?: string; endDate?: string; spent?: number; balance?: number }): ProjectPayload {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description ?? "",
    allocatedBudget: doc.allocatedBudget,
    status: statusDisplay[doc.status] ?? doc.status,
    startDate: doc.startDate ?? "",
    endDate: doc.endDate ?? "",
    spent: doc.spent ?? 0,
    balance: doc.balance ?? 0,
  };
}

/** Optional actor: when role is site_manager, returns only the assigned project */
export async function listProjects(actor?: { userId: string; role: string }): Promise<ProjectPayload[]> {
  if (actor?.role === "site_manager") {
    const user = await User.findById(actor.userId).select("assignedProjectId").lean();
    if (!user?.assignedProjectId) return [];
    const doc = await Project.findById(user.assignedProjectId).lean();
    return doc ? [toPayload(doc)] : [];
  }
  const docs = await Project.find().lean();
  return docs.map(toPayload);
}

export async function createProject(actor: { userId: string; email: string; role: string }, input: CreateProjectInput): Promise<ProjectPayload> {
  if (!input.name?.trim()) {
    throw new Error("Project name is required");
  }
  const budget = Number(input.allocatedBudget);
  if (isNaN(budget) || budget <= 0) {
    throw new Error("Valid allocated budget is required");
  }

  const status = input.status ? (statusToDb[input.status] ?? input.status.toLowerCase().replace(/\s+/g, "_")) : "active";
  if (!["active", "on_hold", "completed"].includes(status)) {
    throw new Error("Invalid status");
  }

  const project = await Project.create({
    name: input.name.trim(),
    description: (input.description ?? "").trim(),
    allocatedBudget: budget,
    status,
    startDate: input.startDate?.trim() ?? "",
    endDate: input.endDate?.trim() ?? "",
    spent: 0,
  });

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "create",
    module: "projects",
    entityId: project._id.toString(),
    description: `Created project: ${project.name}`,
    newValue: { name: project.name, status: statusDisplay[project.status], allocatedBudget: project.allocatedBudget },
  });

  return toPayload(project);
}

export async function updateProject(
  actor: { userId: string; email: string; role: string },
  id: string,
  input: UpdateProjectInput
): Promise<ProjectPayload> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid project ID");
  }

  const target = await Project.findById(id);
  if (!target) {
    throw new Error("Project not found");
  }

  const updates: Record<string, unknown> = {};

  if (input.name != null) updates.name = input.name.trim();
  if (input.description != null) updates.description = input.description.trim();
  if (input.allocatedBudget != null) {
    const budget = Number(input.allocatedBudget);
    if (isNaN(budget) || budget < 0) throw new Error("Valid allocated budget is required");
    updates.allocatedBudget = budget;
  }
  if (input.status != null) {
    const status = statusToDb[input.status] ?? input.status.toLowerCase().replace(/\s+/g, "_");
    if (!["active", "on_hold", "completed"].includes(status)) throw new Error("Invalid status");
    updates.status = status;
  }
  if (input.startDate !== undefined) updates.startDate = input.startDate?.trim() ?? "";
  if (input.endDate !== undefined) updates.endDate = input.endDate?.trim() ?? "";

  const updated = await Project.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) {
    throw new Error("Update failed");
  }

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "update",
    module: "projects",
    entityId: id,
    description: `Updated project: ${target.name}`,
    oldValue: { name: target.name, status: statusDisplay[target.status], allocatedBudget: target.allocatedBudget },
    newValue: { name: updated.name, status: statusDisplay[updated.status], allocatedBudget: updated.allocatedBudget },
  });

  return toPayload(updated);
}

export async function deleteProject(actor: { userId: string; email: string; role: string }, id: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid project ID");
  }

  const target = await Project.findById(id);
  if (!target) {
    throw new Error("Project not found");
  }

  const usersAssigned = await User.find({ assignedProjectId: id }).select("name").lean();
  if (usersAssigned.length > 0) {
    const names = usersAssigned.map((u) => u.name).join(", ");
    throw new Error(
      `Cannot delete this project because it is assigned to Site Manager${usersAssigned.length > 1 ? "s" : ""}: ${names}. Reassign the manager first.`
    );
  }

  const projectObjId = new mongoose.Types.ObjectId(id);

  const consumableCount = await ItemLedgerEntry.countDocuments({ projectId: projectObjId });
  if (consumableCount > 0) {
    throw new Error(
      `Cannot delete: project has consumable ledger entries (${consumableCount} entries). Remove ledger entries first.`
    );
  }

  const nonConsumableCount = await NonConsumableLedgerEntry.countDocuments({
    $or: [{ projectTo: projectObjId }, { projectFrom: projectObjId }],
  });
  if (nonConsumableCount > 0) {
    throw new Error(
      `Cannot delete: project has non-consumable ledger entries (${nonConsumableCount} entries). Remove ledger entries first.`
    );
  }

  const contractorEntryCount = await ContractorEntry.countDocuments({ projectId: projectObjId });
  if (contractorEntryCount > 0) {
    throw new Error(
      `Cannot delete: project has contractor ledger entries (${contractorEntryCount} entries). Remove ledger entries first.`
    );
  }

  await Project.findByIdAndDelete(id);

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "delete",
    module: "projects",
    entityId: id,
    description: `Deleted project: ${target.name}`,
    oldValue: { name: target.name, status: statusDisplay[target.status] },
  });
}
