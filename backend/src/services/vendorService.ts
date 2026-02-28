import mongoose from "mongoose";
import { Vendor } from "../models/Vendor.js";
import { User } from "../models/User.js";
import { logAudit } from "./auditService.js";
import { roleDisplay } from "./authService.js";

export interface VendorPayload {
  id: string;
  projectId: string;
  name: string;
  phone: string;
  description: string;
  totalBilled: number;
  totalPaid: number;
  remaining: number;
}

export interface CreateVendorInput {
  projectId: string;
  name: string;
  phone?: string;
  description?: string;
}

export interface UpdateVendorInput {
  name?: string;
  phone?: string;
  description?: string;
}

function toPayload(
  doc: { _id: mongoose.Types.ObjectId; projectId: mongoose.Types.ObjectId; name: string; phone?: string; description?: string; totalBilled?: number; totalPaid?: number; remaining?: number }
): VendorPayload {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId?.toString() ?? "",
    name: doc.name,
    phone: doc.phone ?? "",
    description: doc.description ?? "",
    totalBilled: doc.totalBilled ?? 0,
    totalPaid: doc.totalPaid ?? 0,
    remaining: doc.remaining ?? 0,
  };
}

/** List vendors for a project. Site Manager: uses assigned project. Admin/Super Admin: uses projectId param. */
export async function listVendors(
  actor: { userId: string; role: string },
  projectIdParam?: string
): Promise<VendorPayload[]> {
  let projectId: string | undefined;
  if (actor.role === "site_manager") {
    const user = await User.findById(actor.userId).select("assignedProjectId").lean();
    projectId = user?.assignedProjectId?.toString();
    if (!projectId) return [];
  } else {
    projectId = projectIdParam;
  }
  const query =
    projectId && mongoose.Types.ObjectId.isValid(projectId) ? { projectId } : {};
  const docs = await Vendor.find(query).lean();
  return docs.map(toPayload);
}

export async function getVendorById(id: string): Promise<VendorPayload | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await Vendor.findById(id).lean();
  return doc ? toPayload(doc) : null;
}

/** Create vendor. Site Manager: uses assigned project. Admin/Super Admin: requires projectId in input. */
export async function createVendor(
  actor: { userId: string; email: string; role: string },
  input: CreateVendorInput
): Promise<VendorPayload> {
  if (!input.name?.trim()) {
    throw new Error("Vendor name is required");
  }

  let projectId: string;
  if (actor.role === "site_manager") {
    const user = await User.findById(actor.userId).select("assignedProjectId").lean();
    projectId = user?.assignedProjectId?.toString() ?? "";
    if (!projectId) throw new Error("Site Manager must be assigned to a project to create vendors");
  } else {
    projectId = input.projectId ?? "";
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      throw new Error("Project is required");
    }
  }

  const vendor = await Vendor.create({
    projectId,
    name: input.name.trim(),
    phone: (input.phone ?? "").trim(),
    description: (input.description ?? "").trim(),
    totalBilled: 0,
    totalPaid: 0,
    remaining: 0,
  });

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "create",
    module: "vendors",
    entityId: vendor._id.toString(),
    description: `Created vendor: ${vendor.name}`,
    newValue: { name: vendor.name },
  });

  return toPayload(vendor);
}

export async function updateVendor(
  actor: { userId: string; email: string; role: string },
  id: string,
  input: UpdateVendorInput
): Promise<VendorPayload> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid vendor ID");
  }

  const target = await Vendor.findById(id);
  if (!target) {
    throw new Error("Vendor not found");
  }

  const updates: Record<string, unknown> = {};
  if (input.name != null) updates.name = input.name.trim();
  if (input.phone != null) updates.phone = input.phone.trim();
  if (input.description != null) updates.description = input.description.trim();

  const updated = await Vendor.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) throw new Error("Update failed");

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "update",
    module: "vendors",
    entityId: id,
    description: `Updated vendor: ${target.name}`,
    oldValue: { name: target.name },
    newValue: { name: updated.name },
  });

  return toPayload(updated);
}

/** Cannot delete vendor if they have remaining amount (outstanding balance). */
export async function deleteVendor(
  actor: { userId: string; email: string; role: string },
  id: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid vendor ID");
  }

  const target = await Vendor.findById(id);
  if (!target) {
    throw new Error("Vendor not found");
  }

  if (target.remaining > 0) {
    throw new Error(
      `Cannot delete vendor "${target.name}" because they have remaining amount of ${target.remaining.toLocaleString()} PKR. Clear the outstanding balance first.`
    );
  }

  await Vendor.findByIdAndDelete(id);

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "delete",
    module: "vendors",
    entityId: id,
    description: `Deleted vendor: ${target.name}`,
    oldValue: { name: target.name },
  });
}
