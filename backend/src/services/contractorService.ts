import mongoose from "mongoose";
import { Contractor } from "../models/Contractor.js";
import { ContractorEntry } from "../models/ContractorEntry.js";
import { ContractorPayment } from "../models/ContractorPayment.js";
import { ContractorPaymentAllocation } from "../models/ContractorPaymentAllocation.js";
import { User } from "../models/User.js";
import { logAudit } from "./auditService.js";
import { roleDisplay } from "./authService.js";

export interface ContractorPayload {
  id: string;
  projectId: string;
  name: string;
  phone: string;
  description: string;
}

export interface ContractorWithTotals extends ContractorPayload {
  totalAmount: number;
  totalPaid: number;
  remaining: number;
}

export interface CreateContractorInput {
  projectId: string;
  name: string;
  phone?: string;
  description?: string;
}

export interface UpdateContractorInput {
  name?: string;
  phone?: string;
  description?: string;
}

function toPayload(doc: {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  description?: string;
}): ContractorPayload {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId?.toString() ?? "",
    name: doc.name,
    phone: doc.phone ?? "",
    description: doc.description ?? "",
  };
}

export interface ContractorTotals {
  totalAmount: number;
  totalPaid: number;
  remaining: number;
}

/** Compute contractor totals from entries and payments (all-time). */
export async function getContractorTotals(contractorId: string): Promise<ContractorTotals> {
  if (!mongoose.Types.ObjectId.isValid(contractorId)) {
    return { totalAmount: 0, totalPaid: 0, remaining: 0 };
  }
  const [entrySum, paymentSum] = await Promise.all([
    ContractorEntry.aggregate([{ $match: { contractorId: new mongoose.Types.ObjectId(contractorId) } }, { $group: { _id: null, total: { $sum: "$amount" } } }]).then((r) => r[0]?.total ?? 0),
    ContractorPayment.aggregate([{ $match: { contractorId: new mongoose.Types.ObjectId(contractorId) } }, { $group: { _id: null, total: { $sum: "$amount" } } }]).then((r) => r[0]?.total ?? 0),
  ]);
  const totalAmount = entrySum;
  const totalPaid = paymentSum;
  const remaining = Math.max(0, totalAmount - totalPaid);
  return { totalAmount, totalPaid, remaining };
}

/** List contractors for a project. Site Manager: uses assigned project. Admin/Super Admin: uses projectId param. */
export async function listContractors(
  actor: { userId: string; role: string },
  projectIdParam?: string
): Promise<ContractorWithTotals[]> {
  let projectId: string | undefined;
  if (actor.role === "site_manager") {
    const user = await User.findById(actor.userId).select("assignedProjectId").lean();
    projectId = user?.assignedProjectId?.toString();
    if (!projectId) return [];
  } else {
    projectId = projectIdParam;
  }
  const query = projectId && mongoose.Types.ObjectId.isValid(projectId) ? { projectId } : {};
  const docs = await Contractor.find(query).lean();
  const result: ContractorWithTotals[] = [];
  for (const doc of docs) {
    const totals = await getContractorTotals(doc._id.toString());
    result.push({
      ...toPayload(doc),
      totalAmount: totals.totalAmount,
      totalPaid: totals.totalPaid,
      remaining: totals.remaining,
    });
  }
  return result;
}

export async function getContractorById(id: string): Promise<ContractorPayload | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await Contractor.findById(id).lean();
  return doc ? toPayload(doc) : null;
}

/** Create contractor. Site Manager: uses assigned project. Admin/Super Admin: requires projectId in input. */
export async function createContractor(
  actor: { userId: string; email: string; role: string },
  input: CreateContractorInput
): Promise<ContractorPayload> {
  if (!input.name?.trim()) {
    throw new Error("Contractor name is required");
  }

  let projectId: string;
  if (actor.role === "site_manager") {
    const user = await User.findById(actor.userId).select("assignedProjectId").lean();
    projectId = user?.assignedProjectId?.toString() ?? "";
    if (!projectId) throw new Error("Site Manager must be assigned to a project to create contractors");
  } else {
    projectId = input.projectId ?? "";
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      throw new Error("Project is required");
    }
  }

  const contractor = await Contractor.create({
    projectId,
    name: input.name.trim(),
    phone: (input.phone ?? "").trim(),
    description: (input.description ?? "").trim(),
  });

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "create",
    module: "contractors",
    entityId: contractor._id.toString(),
    description: `Created contractor: ${contractor.name}`,
    newValue: { name: contractor.name },
  });

  return toPayload(contractor);
}

export async function updateContractor(
  actor: { userId: string; email: string; role: string },
  id: string,
  input: UpdateContractorInput
): Promise<ContractorPayload> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid contractor ID");
  }

  const target = await Contractor.findById(id);
  if (!target) {
    throw new Error("Contractor not found");
  }

  const updates: Record<string, unknown> = {};
  if (input.name != null) updates.name = input.name.trim();
  if (input.phone != null) updates.phone = input.phone.trim();
  if (input.description != null) updates.description = input.description.trim();

  const updated = await Contractor.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) throw new Error("Update failed");

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "update",
    module: "contractors",
    entityId: id,
    description: `Updated contractor: ${target.name}`,
    oldValue: { name: target.name },
    newValue: { name: updated.name },
  });

  return toPayload(updated);
}

/** Cannot delete contractor if they have remaining amount (outstanding balance). */
export async function deleteContractor(
  actor: { userId: string; email: string; role: string },
  id: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid contractor ID");
  }

  const target = await Contractor.findById(id);
  if (!target) {
    throw new Error("Contractor not found");
  }

  const { remaining } = await getContractorTotals(id);
  if (remaining > 0) {
    throw new Error(
      `Cannot delete contractor "${target.name}" because they have remaining amount of ${remaining.toLocaleString()} PKR. Clear the outstanding balance first.`
    );
  }

  await ContractorEntry.deleteMany({ contractorId: id });
  await ContractorPayment.deleteMany({ contractorId: id });
  await ContractorPaymentAllocation.deleteMany({ contractorId: id });
  await Contractor.findByIdAndDelete(id);

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "delete",
    module: "contractors",
    entityId: id,
    description: `Deleted contractor: ${target.name}`,
    oldValue: { name: target.name },
  });
}
