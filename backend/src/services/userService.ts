import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { logAudit } from "./auditService.js";
import { canManageUser } from "../middleware/rbac.js";
import { roleDisplay } from "./authService.js";
import type { UserRole } from "../models/User.js";

export interface UserPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedProjectId?: string;
  assignedProjectName?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: string;
  assignedProjectId?: string;
  assignedProjectName?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  assignedProjectId?: string | null;
  assignedProjectName?: string | null;
}

export interface Actor {
  userId: string;
  email: string;
  role: UserRole;
}

export async function listUsers(): Promise<UserPayload[]> {
  const users = await User.find().select("-passwordHash").lean();
  return users.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: roleDisplay[u.role],
    assignedProjectId: u.assignedProjectId,
    assignedProjectName: u.assignedProjectName,
  }));
}

export async function createUser(actor: Actor, input: CreateUserInput): Promise<UserPayload> {
  const targetRole = input.role.toLowerCase().replace(/\s+/g, "_") as UserRole;
  if (!["super_admin", "admin", "site_manager"].includes(targetRole)) {
    throw new Error("Invalid role");
  }
  if (!canManageUser(actor.role, targetRole)) {
    throw new Error("You cannot create users with this role");
  }

  const existing = await User.findOne({ email: input.email.toLowerCase().trim() });
  if (existing) {
    throw new Error("Email already in use");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await User.create({
    name: input.name.trim(),
    email: input.email.toLowerCase().trim(),
    passwordHash,
    role: targetRole,
    assignedProjectId: input.assignedProjectId || undefined,
    assignedProjectName: input.assignedProjectName || undefined,
  });

  const actorUser = await User.findById(actor.userId).lean();
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role: roleDisplay[actor.role],
    action: "create",
    module: "users",
    entityId: user._id.toString(),
    description: `Created user ${user.email} with role ${roleDisplay[user.role]}`,
    newValue: { name: user.name, email: user.email, role: roleDisplay[user.role] },
  });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: roleDisplay[user.role],
    assignedProjectId: user.assignedProjectId,
    assignedProjectName: user.assignedProjectName,
  };
}

export async function updateUser(
  actor: Actor,
  id: string,
  input: UpdateUserInput
): Promise<UserPayload> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid user ID");
  }

  const target = await User.findById(id);
  if (!target) {
    throw new Error("User not found");
  }
  if (!canManageUser(actor.role, target.role)) {
    throw new Error("You cannot edit this user");
  }

  const updates: Partial<{
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    assignedProjectId?: string | null;
    assignedProjectName?: string | null;
  }> = {};

  if (input.name != null) updates.name = input.name.trim();
  if (input.password != null && input.password.trim()) {
    updates.passwordHash = await bcrypt.hash(input.password, 10);
  }
  if (input.email != null) {
    const lower = input.email.toLowerCase().trim();
    const existing = await User.findOne({ email: lower, _id: { $ne: id } });
    if (existing) throw new Error("Email already in use");
    updates.email = lower;
  }
  if (input.role != null) {
    const targetRole = input.role.toLowerCase().replace(/\s+/g, "_") as UserRole;
    if (!["super_admin", "admin", "site_manager"].includes(targetRole)) {
      throw new Error("Invalid role");
    }
    if (!canManageUser(actor.role, targetRole)) {
      throw new Error("You cannot assign this role");
    }
    updates.role = targetRole;
  }
  if (input.assignedProjectId !== undefined) {
    updates.assignedProjectId = (input.assignedProjectId && String(input.assignedProjectId).trim()) ? String(input.assignedProjectId).trim() : null;
  }
  if (input.assignedProjectName !== undefined) {
    updates.assignedProjectName = (input.assignedProjectName != null && String(input.assignedProjectName).trim()) ? String(input.assignedProjectName).trim() : null;
  }

  const updated = await User.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) {
    throw new Error("Update failed");
  }

  const actorUser = await User.findById(actor.userId).lean();
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role: roleDisplay[actor.role],
    action: "update",
    module: "users",
    entityId: id,
    description: `Updated user ${target.email}`,
    oldValue: { name: target.name, email: target.email, role: roleDisplay[target.role], assignedProjectId: target.assignedProjectId },
    newValue: { name: updated.name, email: updated.email, role: roleDisplay[updated.role], assignedProjectId: updated.assignedProjectId },
  });

  return {
    id: updated._id.toString(),
    name: updated.name,
    email: updated.email,
    role: roleDisplay[updated.role],
    assignedProjectId: updated.assignedProjectId,
    assignedProjectName: updated.assignedProjectName,
  };
}

export async function deleteUser(actor: Actor, id: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid user ID");
  }
  if (actor.userId === id) {
    throw new Error("Cannot delete yourself");
  }

  const target = await User.findById(id);
  if (!target) {
    throw new Error("User not found");
  }
  if (!canManageUser(actor.role, target.role)) {
    throw new Error("You cannot delete this user");
  }

  await User.findByIdAndDelete(id);

  const actorUser = await User.findById(actor.userId).lean();
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role: roleDisplay[actor.role],
    action: "delete",
    module: "users",
    entityId: id,
    description: `Deleted user ${target.email}`,
    oldValue: { name: target.name, email: target.email, role: roleDisplay[target.role] },
  });
}
