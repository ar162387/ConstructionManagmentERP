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
  assignedProjectIds?: string[];
  assignedProjectNames?: string[];
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: string;
  assignedProjectIds?: string[];
  assignedProjectNames?: string[];
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  assignedProjectIds?: string[] | null;
  assignedProjectNames?: string[] | null;
}

export interface Actor {
  userId: string;
  email: string;
  role: UserRole;
}

/** Reads assigned projects off a user doc, falling back to the legacy single-project fields for
 *  users that haven't been migrated to the array fields yet. */
function projectIdsOf(u: { assignedProjectIds?: string[]; assignedProjectId?: string }): string[] {
  if (u.assignedProjectIds && u.assignedProjectIds.length) return u.assignedProjectIds;
  return u.assignedProjectId ? [u.assignedProjectId] : [];
}
function projectNamesOf(u: { assignedProjectNames?: string[]; assignedProjectName?: string }): string[] {
  if (u.assignedProjectNames && u.assignedProjectNames.length) return u.assignedProjectNames;
  return u.assignedProjectName ? [u.assignedProjectName] : [];
}

export async function listUsers(): Promise<UserPayload[]> {
  const users = await User.find().select("-passwordHash").lean();
  return users.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: roleDisplay[u.role],
    assignedProjectIds: projectIdsOf(u),
    assignedProjectNames: projectNamesOf(u),
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
    assignedProjectIds: input.assignedProjectIds?.length ? input.assignedProjectIds : undefined,
    assignedProjectNames: input.assignedProjectNames?.length ? input.assignedProjectNames : undefined,
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
    assignedProjectIds: projectIdsOf(user),
    assignedProjectNames: projectNamesOf(user),
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
    assignedProjectIds?: string[] | null;
    assignedProjectNames?: string[] | null;
    // Clear the legacy single-project fields once a user is edited through the array-based flow
    // so listUsers()'s back-compat fallback doesn't resurrect a stale value.
    assignedProjectId?: null;
    assignedProjectName?: null;
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
  if (input.assignedProjectIds !== undefined) {
    updates.assignedProjectIds = input.assignedProjectIds?.length ? input.assignedProjectIds : null;
    updates.assignedProjectId = null;
  }
  if (input.assignedProjectNames !== undefined) {
    updates.assignedProjectNames = input.assignedProjectNames?.length ? input.assignedProjectNames : null;
    updates.assignedProjectName = null;
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
    oldValue: { name: target.name, email: target.email, role: roleDisplay[target.role], assignedProjectIds: projectIdsOf(target) },
    newValue: { name: updated.name, email: updated.email, role: roleDisplay[updated.role], assignedProjectIds: projectIdsOf(updated) },
  });

  return {
    id: updated._id.toString(),
    name: updated.name,
    email: updated.email,
    role: roleDisplay[updated.role],
    assignedProjectIds: projectIdsOf(updated),
    assignedProjectNames: projectNamesOf(updated),
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
