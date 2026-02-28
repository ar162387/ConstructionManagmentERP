import mongoose from "mongoose";
import { NonConsumableLedgerEntry } from "../models/NonConsumableLedgerEntry.js";
import { NonConsumableItem } from "../models/NonConsumableItem.js";
import { User } from "../models/User.js";
import { logAudit } from "./auditService.js";
import { roleDisplay } from "./authService.js";
import type { NonConsumableEventType } from "../models/NonConsumableLedgerEntry.js";

export interface NonConsumableLedgerPayload {
  id: string;
  itemId: string;
  date: string;
  eventType: NonConsumableEventType;
  quantity: number;
  totalCost?: number;
  projectTo?: string;
  projectToName?: string;
  projectFrom?: string;
  projectFromName?: string;
  remarks?: string;
  createdBy: string;
}

export interface CreateNonConsumableLedgerInput {
  itemId: string;
  date: string;
  eventType: NonConsumableEventType;
  quantity: number;
  totalCost?: number;
  projectTo?: string;
  projectFrom?: string;
  remarks?: string;
}

export interface UpdateNonConsumableLedgerInput {
  date?: string;
  eventType?: NonConsumableEventType;
  quantity?: number;
  totalCost?: number;
  projectTo?: string;
  projectFrom?: string;
  remarks?: string;
}

interface Balances {
  companyStore: number;
  inUseByProject: Map<string, number>;
  underRepair: number;
  lost: number;
}

const EVENT_TYPES: NonConsumableEventType[] = [
  "Purchase",
  "AssignToProject",
  "ReturnToCompany",
  "Repair",
  "ReturnFromRepair",
  "MarkLost",
];

const DEFAULT_PAGE_SIZE = 12;

export interface ListNonConsumableLedgerOptions {
  page?: number;
  pageSize?: number;
}

export interface ListNonConsumableLedgerResult {
  entries: NonConsumableLedgerPayload[];
  total: number;
}

/** Compute balances from ledger entries for an item (source of truth). */
async function computeBalances(itemId: mongoose.Types.ObjectId): Promise<Balances> {
  const entries = await NonConsumableLedgerEntry.find({ itemId }).sort({ date: 1, createdAt: 1 }).lean();

  let companyStore = 0;
  const inUseByProject = new Map<string, number>();
  let underRepair = 0;
  let lost = 0;

  for (const e of entries) {
    const qty = e.quantity;
    const toId = e.projectTo?.toString();
    const fromId = e.projectFrom?.toString();

    switch (e.eventType) {
      case "Purchase":
        companyStore += qty;
        break;
      case "AssignToProject":
        if (!toId) break;
        companyStore -= qty;
        inUseByProject.set(toId, (inUseByProject.get(toId) ?? 0) + qty);
        break;
      case "ReturnToCompany":
        if (!fromId) break;
        const returnInUse = inUseByProject.get(fromId) ?? 0;
        inUseByProject.set(fromId, Math.max(0, returnInUse - qty));
        companyStore += qty;
        break;
      case "Repair":
        if (!fromId) break;
        const repairInUse = inUseByProject.get(fromId) ?? 0;
        inUseByProject.set(fromId, Math.max(0, repairInUse - qty));
        underRepair += qty;
        break;
      case "ReturnFromRepair":
        underRepair -= qty;
        companyStore += qty;
        break;
      case "MarkLost":
        if (!fromId) break;
        const lostInUse = inUseByProject.get(fromId) ?? 0;
        inUseByProject.set(fromId, Math.max(0, lostInUse - qty));
        lost += qty;
        break;
    }
  }

  return { companyStore, inUseByProject, underRepair, lost };
}

/** Get in-use quantity per project for an item (for display and validation). */
export async function getInUseByProjectForItem(
  itemId: mongoose.Types.ObjectId
): Promise<{ projectId: string; projectName: string; quantity: number }[]> {
  const balances = await computeBalances(itemId);
  const projectIds = [...balances.inUseByProject.entries()]
    .filter(([, qty]) => qty > 0)
    .map(([id]) => id);
  if (projectIds.length === 0) return [];

  const { Project } = await import("../models/Project.js");
  const objectIds = projectIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const projects = await Project.find({ _id: { $in: objectIds } }).select("name").lean();
  const nameMap = new Map(projects.map((p) => [p._id.toString(), p.name]));

  return projectIds.map((projectId) => ({
    projectId,
    projectName: nameMap.get(projectId) ?? "Unknown",
    quantity: balances.inUseByProject.get(projectId) ?? 0,
  }));
}

/** Update NonConsumableItem with computed balances. */
async function syncItemBalances(itemId: mongoose.Types.ObjectId): Promise<void> {
  const balances = await computeBalances(itemId);
  const inUse = [...balances.inUseByProject.values()].reduce((a, b) => a + b, 0);
  const totalQuantity =
    Math.max(0, balances.companyStore) + inUse + balances.underRepair + balances.lost;

  await NonConsumableItem.findByIdAndUpdate(itemId, {
    companyStore: Math.max(0, balances.companyStore),
    inUse,
    underRepair: balances.underRepair,
    lost: balances.lost,
    totalQuantity,
  });
}

async function buildPayload(
  doc: {
    _id: mongoose.Types.ObjectId;
    itemId: mongoose.Types.ObjectId;
    date: string;
    eventType: NonConsumableEventType;
    quantity: number;
    totalCost?: number;
    projectTo?: mongoose.Types.ObjectId;
    projectFrom?: mongoose.Types.ObjectId;
    remarks?: string;
    createdBy: mongoose.Types.ObjectId;
  },
  projectNames?: Map<string, string>
): Promise<NonConsumableLedgerPayload> {
  const payload: NonConsumableLedgerPayload = {
    id: doc._id.toString(),
    itemId: doc.itemId.toString(),
    date: doc.date,
    eventType: doc.eventType,
    quantity: doc.quantity,
    totalCost: doc.totalCost,
    projectTo: doc.projectTo?.toString(),
    projectFrom: doc.projectFrom?.toString(),
    remarks: doc.remarks,
    createdBy: doc.createdBy.toString(),
  };
  if (projectNames && doc.projectTo)
    payload.projectToName = projectNames.get(doc.projectTo.toString());
  if (projectNames && doc.projectFrom)
    payload.projectFromName = projectNames.get(doc.projectFrom.toString());
  return payload;
}

export async function listNonConsumableLedger(
  itemId: string,
  options?: ListNonConsumableLedgerOptions
): Promise<ListNonConsumableLedgerResult> {
  if (!mongoose.Types.ObjectId.isValid(itemId)) return { entries: [], total: 0 };

  const docs = await NonConsumableLedgerEntry.find({ itemId })
    .sort({ date: -1, createdAt: -1 })
    .lean();

  const projectIds = [
    ...new Set([
      ...docs.map((d) => d.projectTo?.toString()).filter(Boolean),
      ...docs.map((d) => d.projectFrom?.toString()).filter(Boolean),
    ]),
  ].filter((id): id is string => !!id);

  const projectNames = new Map<string, string>();
  if (projectIds.length > 0) {
    const { Project } = await import("../models/Project.js");
    const projects = await Project.find({ _id: { $in: projectIds } }).select("name").lean();
    for (const p of projects) {
      projectNames.set(p._id.toString(), p.name);
    }
  }

  const payloads = await Promise.all(docs.map((d) => buildPayload(d, projectNames)));
  const total = payloads.length;
  const pageSize = Math.min(Math.max(1, options?.pageSize ?? DEFAULT_PAGE_SIZE), 100);
  const page = Math.max(1, options?.page ?? 1);
  const start = (page - 1) * pageSize;
  const entries = payloads.slice(start, start + pageSize);

  return { entries, total };
}

export async function createNonConsumableLedgerEntry(
  actor: { userId: string; email: string; role: string },
  input: CreateNonConsumableLedgerInput
): Promise<NonConsumableLedgerPayload> {
  if (!input.date) throw new Error("Date is required");
  if (!input.quantity || input.quantity < 1) throw new Error("Quantity must be at least 1");
  if (!EVENT_TYPES.includes(input.eventType)) throw new Error("Invalid event type");

  const item = await NonConsumableItem.findById(input.itemId).lean();
  if (!item) throw new Error("Item not found");

  const balances = await computeBalances(item._id);

  // Validate based on event type
  if (input.eventType === "Purchase") {
    const totalCost = input.totalCost ?? 0;
    if (totalCost < 0) throw new Error("Total cost cannot be negative");
  }

  if (input.eventType === "AssignToProject") {
    if (!input.projectTo || !mongoose.Types.ObjectId.isValid(input.projectTo)) {
      throw new Error("Project is required for Assign to Project");
    }
    if (input.quantity > Math.max(0, balances.companyStore)) {
      throw new Error(
        `Quantity exceeds available in Company Store (${Math.max(0, balances.companyStore)} available)`
      );
    }
  }

  if (
    input.eventType === "ReturnToCompany" ||
    input.eventType === "Repair" ||
    input.eventType === "MarkLost"
  ) {
    if (!input.projectFrom || !mongoose.Types.ObjectId.isValid(input.projectFrom)) {
      throw new Error("Project is required for this event type");
    }
    const inUse = balances.inUseByProject.get(input.projectFrom) ?? 0;
    if (input.quantity > inUse) {
      throw new Error(`Quantity exceeds in-use quantity for this project (${inUse} available)`);
    }
  }

  if (input.eventType === "ReturnFromRepair") {
    const underRepairAvailable = Math.max(0, balances.underRepair);
    if (input.quantity > underRepairAvailable) {
      throw new Error(
        `Quantity exceeds available Under Repair (${underRepairAvailable} available)`
      );
    }
  }

  if (input.eventType === "Repair" && (input.totalCost ?? 0) < 0) {
    throw new Error("Total cost cannot be negative");
  }

  const userId = new mongoose.Types.ObjectId(actor.userId);
  const entry = await NonConsumableLedgerEntry.create({
    itemId: input.itemId,
    date: input.date,
    eventType: input.eventType,
    quantity: input.quantity,
    totalCost: input.eventType === "Purchase" || input.eventType === "Repair" ? input.totalCost : undefined,
    projectTo:
      input.eventType === "AssignToProject" && input.projectTo
        ? new mongoose.Types.ObjectId(input.projectTo)
        : undefined,
    projectFrom:
      (input.eventType === "ReturnToCompany" ||
        input.eventType === "Repair" ||
        input.eventType === "MarkLost") &&
      input.projectFrom
        ? new mongoose.Types.ObjectId(input.projectFrom)
        : undefined,
    remarks: input.remarks?.trim() || undefined,
    createdBy: userId,
  });

  await syncItemBalances(item._id);

  const { Project } = await import("../models/Project.js");
  const projectIds = [entry.projectTo?.toString(), entry.projectFrom?.toString()].filter(
    (id): id is string => !!id
  );
  const projectNames = new Map<string, string>();
  if (projectIds.length > 0) {
    const projects = await Project.find({ _id: { $in: projectIds } }).select("name").lean();
    for (const p of projects) projectNames.set(p._id.toString(), p.name);
  }

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "create",
    module: "non_consumable_ledger",
    entityId: entry._id.toString(),
    description: `Added ledger entry: ${input.eventType} — ${item.name} x ${input.quantity}`,
    newValue: { eventType: input.eventType, quantity: input.quantity },
  });

  return buildPayload(entry.toObject(), projectNames);
}

export async function updateNonConsumableLedgerEntry(
  actor: { userId: string; email: string; role: string },
  id: string,
  input: UpdateNonConsumableLedgerInput
): Promise<NonConsumableLedgerPayload> {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid ledger entry ID");

  const existing = await NonConsumableLedgerEntry.findById(id).lean();
  if (!existing) throw new Error("Ledger entry not found");

  const item = await NonConsumableItem.findById(existing.itemId).lean();
  if (!item) throw new Error("Item not found");

  const newEventType = input.eventType ?? existing.eventType;
  const newQuantity = input.quantity ?? existing.quantity;
  const newDate = input.date ?? existing.date;
  const newTotalCost = input.totalCost !== undefined ? input.totalCost : existing.totalCost;
  const newProjectTo =
    input.projectTo !== undefined
      ? input.projectTo
        ? new mongoose.Types.ObjectId(input.projectTo)
        : undefined
      : existing.projectTo;
  const newProjectFrom =
    input.projectFrom !== undefined
      ? input.projectFrom
        ? new mongoose.Types.ObjectId(input.projectFrom)
        : undefined
      : existing.projectFrom;

  if (newQuantity < 1) throw new Error("Quantity must be at least 1");

  // For update: we reverse the old entry and apply the new one. Temporarily remove old to validate new.
  // Simpler: delete old, insert new (with validation). But that would change entry ID.
  // Better: update in place, then recompute balances. But we must validate the NEW movement.
  // To validate: compute balances AS IF the old entry didn't exist, then check if new movement is valid.
  const allEntries = await NonConsumableLedgerEntry.find({
    itemId: existing.itemId,
    _id: { $ne: existing._id },
  })
    .sort({ date: 1, createdAt: 1 })
    .lean();

  const balancesWithoutOld = { companyStore: 0, inUseByProject: new Map<string, number>(), underRepair: 0, lost: 0 };

  for (const e of allEntries) {
    const qty = e.quantity;
    const toId = e.projectTo?.toString();
    const fromId = e.projectFrom?.toString();
    switch (e.eventType) {
      case "Purchase":
        balancesWithoutOld.companyStore += qty;
        break;
      case "AssignToProject":
        if (toId) {
          balancesWithoutOld.companyStore -= qty;
          balancesWithoutOld.inUseByProject.set(toId, (balancesWithoutOld.inUseByProject.get(toId) ?? 0) + qty);
        }
        break;
      case "ReturnToCompany":
        if (fromId) {
          const r = balancesWithoutOld.inUseByProject.get(fromId) ?? 0;
          balancesWithoutOld.inUseByProject.set(fromId, Math.max(0, r - qty));
          balancesWithoutOld.companyStore += qty;
        }
        break;
      case "Repair":
        if (fromId) {
          const r = balancesWithoutOld.inUseByProject.get(fromId) ?? 0;
          balancesWithoutOld.inUseByProject.set(fromId, Math.max(0, r - qty));
          balancesWithoutOld.underRepair += qty;
        }
        break;
      case "ReturnFromRepair":
        balancesWithoutOld.underRepair -= qty;
        balancesWithoutOld.companyStore += qty;
        break;
      case "MarkLost":
        if (fromId) {
          const r = balancesWithoutOld.inUseByProject.get(fromId) ?? 0;
          balancesWithoutOld.inUseByProject.set(fromId, Math.max(0, r - qty));
          balancesWithoutOld.lost += qty;
        }
        break;
    }
  }

  // Validate new movement against balancesWithoutOld
  if (newEventType === "Purchase") {
    if ((newTotalCost ?? 0) < 0) throw new Error("Total cost cannot be negative");
  }
  if (newEventType === "AssignToProject") {
    const projId = newProjectTo?.toString();
    if (!projId) throw new Error("Project is required for Assign to Project");
    const companyStore = Math.max(0, balancesWithoutOld.companyStore);
    if (newQuantity > companyStore) {
      throw new Error(`Quantity exceeds available in Company Store (${companyStore} available)`);
    }
  }
  if (newEventType === "ReturnToCompany" || newEventType === "Repair" || newEventType === "MarkLost") {
    const projId = newProjectFrom?.toString();
    if (!projId) throw new Error("Project is required for this event type");
    const inUse = balancesWithoutOld.inUseByProject.get(projId) ?? 0;
    if (newQuantity > inUse) {
      throw new Error(`Quantity exceeds in-use quantity for this project (${inUse} available)`);
    }
  }
  if (newEventType === "ReturnFromRepair") {
    const underRepairAvailable = Math.max(0, balancesWithoutOld.underRepair);
    if (newQuantity > underRepairAvailable) {
      throw new Error(
        `Quantity exceeds available Under Repair (${underRepairAvailable} available)`
      );
    }
  }
  if (newEventType === "Repair" && (newTotalCost ?? 0) < 0) {
    throw new Error("Total cost cannot be negative");
  }

  await NonConsumableLedgerEntry.findByIdAndUpdate(id, {
    date: newDate,
    eventType: newEventType,
    quantity: newQuantity,
    totalCost:
      newEventType === "Purchase" || newEventType === "Repair" ? (newTotalCost ?? 0) : undefined,
    projectTo: newEventType === "AssignToProject" ? newProjectTo : undefined,
    projectFrom:
      newEventType === "ReturnToCompany" ||
      newEventType === "Repair" ||
      newEventType === "MarkLost"
        ? newProjectFrom
        : undefined,
    remarks: (input.remarks ?? existing.remarks)?.trim() || undefined,
  });

  await syncItemBalances(existing.itemId);

  const updated = await NonConsumableLedgerEntry.findById(id).lean();
  if (!updated) throw new Error("Update failed");

  const { Project } = await import("../models/Project.js");
  const projectIds = [updated.projectTo?.toString(), updated.projectFrom?.toString()].filter(
    (id): id is string => !!id
  );
  const projectNames = new Map<string, string>();
  if (projectIds.length > 0) {
    const projects = await Project.find({ _id: { $in: projectIds } }).select("name").lean();
    for (const p of projects) projectNames.set(p._id.toString(), p.name);
  }

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "update",
    module: "non_consumable_ledger",
    entityId: id,
    description: `Updated ledger entry: ${item.name}`,
    oldValue: { eventType: existing.eventType, quantity: existing.quantity },
    newValue: { eventType: newEventType, quantity: newQuantity },
  });

  return buildPayload(updated, projectNames);
}

export async function deleteNonConsumableLedgerEntry(
  actor: { userId: string; email: string; role: string },
  id: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid ledger entry ID");

  const existing = await NonConsumableLedgerEntry.findById(id).lean();
  if (!existing) throw new Error("Ledger entry not found");

  const item = await NonConsumableItem.findById(existing.itemId).lean();
  if (!item) throw new Error("Item not found");

  if (existing.eventType === "Purchase") {
    if (item.companyStore < existing.quantity) {
      throw new Error(
        `Cannot delete Purchase entry: ${existing.quantity} units have been distributed. Company Store balance is ${item.companyStore}. Delete downstream entries (Assign, Return, Repair, Lost) first.`
      );
    }
  }

  await NonConsumableLedgerEntry.findByIdAndDelete(id);
  await syncItemBalances(existing.itemId);

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "delete",
    module: "non_consumable_ledger",
    entityId: id,
    description: `Deleted ledger entry: ${item.name} — ${existing.eventType} x ${existing.quantity}`,
    oldValue: { eventType: existing.eventType, quantity: existing.quantity },
  });
}
