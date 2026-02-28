import mongoose from "mongoose";
import { NonConsumableItem } from "../models/NonConsumableItem.js";
import { User } from "../models/User.js";
import { logAudit } from "./auditService.js";
import { roleDisplay } from "./authService.js";
import { getInUseByProjectForItem } from "./nonConsumableLedgerService.js";

export interface InUseByProjectEntry {
  projectId: string;
  projectName: string;
  quantity: number;
}

export interface NonConsumableItemPayload {
  id: string;
  name: string;
  category: string;
  unit: string;
  totalQuantity: number;
  companyStore: number;
  inUse: number;
  underRepair: number;
  lost: number;
  inUseByProject: InUseByProjectEntry[];
}

export interface CreateNonConsumableItemInput {
  name: string;
  category: string;
  unit?: string;
}

export interface UpdateNonConsumableItemInput {
  name?: string;
  category?: string;
  unit?: string;
}

function toPayload(
  doc: {
    _id: mongoose.Types.ObjectId;
    name: string;
    category: string;
    unit?: string;
    totalQuantity?: number;
    companyStore?: number;
    inUse?: number;
    underRepair?: number;
    lost?: number;
  },
  inUseByProject: InUseByProjectEntry[] = []
): NonConsumableItemPayload {
  return {
    id: doc._id.toString(),
    name: doc.name,
    category: doc.category,
    unit: doc.unit ?? "piece",
    totalQuantity: doc.totalQuantity ?? 0,
    companyStore: doc.companyStore ?? 0,
    inUse: doc.inUse ?? 0,
    underRepair: doc.underRepair ?? 0,
    lost: doc.lost ?? 0,
    inUseByProject,
  };
}

export async function listNonConsumableItems(): Promise<NonConsumableItemPayload[]> {
  const docs = await NonConsumableItem.find().sort({ name: 1 }).lean();
  return docs.map((d) => toPayload(d));
}

export async function getNonConsumableItemById(id: string): Promise<NonConsumableItemPayload | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await NonConsumableItem.findById(id).lean();
  if (!doc) return null;
  const inUseByProject = await getInUseByProjectForItem(doc._id);
  return toPayload(doc, inUseByProject);
}

export async function createNonConsumableItem(
  actor: { userId: string; email: string; role: string },
  input: CreateNonConsumableItemInput
): Promise<NonConsumableItemPayload> {
  const name = (input.name || "").trim();
  if (!name) throw new Error("Item name is required");
  const category = (input.category || "").trim();
  if (!category) throw new Error("Category is required");

  const existing = await NonConsumableItem.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } }).lean();
  if (existing) throw new Error(`Item "${name}" already exists`);

  const doc = await NonConsumableItem.create({
    name,
    category,
    unit: (input.unit || "piece").trim(),
    totalQuantity: 0,
    companyStore: 0,
    inUse: 0,
    underRepair: 0,
    lost: 0,
  });

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "create",
    module: "non_consumable_inventory",
    entityId: doc._id.toString(),
    description: `Added non-consumable asset: ${name} (${category})`,
    newValue: { name, category },
  });

  return toPayload(doc);
}

export async function updateNonConsumableItem(
  actor: { userId: string; email: string; role: string },
  id: string,
  input: UpdateNonConsumableItemInput
): Promise<NonConsumableItemPayload> {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid item ID");
  const doc = await NonConsumableItem.findById(id).lean();
  if (!doc) throw new Error("Item not found");

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = (input.name || "").trim();
    if (!name) throw new Error("Item name cannot be empty");
    const existing = await NonConsumableItem.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      _id: { $ne: doc._id },
    }).lean();
    if (existing) throw new Error(`Item "${name}" already exists`);
    updates.name = name;
  }
  if (input.category !== undefined) updates.category = (input.category || "").trim();
  if (input.unit !== undefined) updates.unit = (input.unit || "piece").trim();

  const updated = await NonConsumableItem.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) throw new Error("Update failed");

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "update",
    module: "non_consumable_inventory",
    entityId: id,
    description: `Updated non-consumable asset: ${updated.name}`,
    oldValue: { name: doc.name, category: doc.category },
    newValue: updates,
  });

  return toPayload(updated);
}

export async function deleteNonConsumableItem(
  actor: { userId: string; email: string; role: string },
  id: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid item ID");
  const doc = await NonConsumableItem.findById(id).lean();
  if (!doc) throw new Error("Item not found");

  const companyStore = doc.companyStore ?? 0;
  const inUse = doc.inUse ?? 0;
  const underRepair = doc.underRepair ?? 0;
  const lost = doc.lost ?? 0;
  if (companyStore !== 0 || inUse !== 0 || underRepair !== 0 || lost !== 0) {
    throw new Error(
      `Cannot delete: item has non-zero balances (Company Store: ${companyStore}, In Use: ${inUse}, Under Repair: ${underRepair}, Lost: ${lost}). Return all items to zero before deleting.`
    );
  }

  const { NonConsumableLedgerEntry } = await import("../models/NonConsumableLedgerEntry.js");
  await NonConsumableLedgerEntry.deleteMany({ itemId: doc._id });
  await NonConsumableItem.findByIdAndDelete(id);

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "delete",
    module: "non_consumable_inventory",
    entityId: id,
    description: `Deleted non-consumable asset: ${doc.name}`,
    oldValue: { name: doc.name, category: doc.category },
  });
}
