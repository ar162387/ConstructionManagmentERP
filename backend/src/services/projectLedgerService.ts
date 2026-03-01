import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { BankTransaction } from "../models/BankTransaction.js";
import { ProjectBalanceAdjustment } from "../models/ProjectBalanceAdjustment.js";
import { User } from "../models/User.js";
import { logAudit } from "./auditService.js";
import { roleDisplay } from "./authService.js";

export type ProjectLedgerRowType = "bank_outflow" | "manual_adjustment";

export interface ProjectLedgerRow {
  type: ProjectLedgerRowType;
  id: string;
  date: string;
  amount: number; // positive for inflow to project, negative for outflow
  source?: string; // bank account name for bank_outflow
  destination?: string; // destination text for bank_outflow
  referenceId?: string; // bank_outflow only
  remarks?: string;
}

export interface GetProjectLedgerOptions {
  page?: number;
  pageSize?: number;
}

export interface CreateProjectBalanceAdjustmentInput {
  date: string;
  amount: number; // positive = add, negative = subtract
  remarks?: string;
}

export interface UpdateProjectBalanceAdjustmentInput {
  date?: string;
  amount?: number;
  remarks?: string;
}

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;

/** Check if actor can access this project (Admin/Super Admin see all; Site Manager only assigned) */
async function canAccessProject(
  actor: { userId: string; role: string },
  projectId: string
): Promise<boolean> {
  if (actor.role === "super_admin" || actor.role === "admin") return true;
  if (actor.role === "site_manager") {
    const user = await User.findById(actor.userId).select("assignedProjectId").lean();
    return user?.assignedProjectId?.toString() === projectId;
  }
  return false;
}

export async function getProjectLedger(
  actor: { userId: string; role: string },
  projectId: string,
  options?: GetProjectLedgerOptions
): Promise<{
  rows: ProjectLedgerRow[];
  total: number;
  balance: number;
  projectName?: string;
}> {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return { rows: [], total: 0, balance: 0 };
  }

  const project = await Project.findById(projectId).lean();
  if (!project) {
    return { rows: [], total: 0, balance: 0 };
  }

  const allowed = await canAccessProject(actor, projectId);
  if (!allowed) {
    return { rows: [], total: 0, balance: project.balance ?? 0, projectName: project.name };
  }

  const [bankTxDocs, adjustmentDocs] = await Promise.all([
    BankTransaction.find({ projectId, type: "outflow" })
      .sort({ date: -1, createdAt: -1 })
      .populate("accountId", "name")
      .lean(),
    ProjectBalanceAdjustment.find({ projectId })
      .sort({ date: -1, createdAt: -1 })
      .lean(),
  ]);

  const bankRows: ProjectLedgerRow[] = bankTxDocs.map((d) => {
    const acc = d.accountId as { name?: string } | null;
    return {
      type: "bank_outflow",
      id: d._id.toString(),
      date: d.date,
      amount: d.amount,
      source: acc?.name,
      destination: d.destination,
      referenceId: d.referenceId,
      remarks: d.remarks,
    };
  });

  const adjRows: ProjectLedgerRow[] = adjustmentDocs.map((d) => ({
    type: "manual_adjustment",
    id: d._id.toString(),
    date: d.date,
    amount: d.amount,
    remarks: d.remarks,
  }));

  const allRows = [...bankRows, ...adjRows].sort((a, b) => {
    const cmp = b.date.localeCompare(a.date);
    if (cmp !== 0) return cmp;
    return a.type === "bank_outflow" ? -1 : 1; // bank before adjustment on same date
  });

  const total = allRows.length;
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, options?.pageSize ?? DEFAULT_PAGE_SIZE));
  const start = (page - 1) * pageSize;
  const rows = allRows.slice(start, start + pageSize);

  return {
    rows,
    total,
    balance: project.balance ?? 0,
    projectName: project.name,
  };
}

export async function createProjectBalanceAdjustment(
  actor: { userId: string; email: string; role: string },
  projectId: string,
  input: CreateProjectBalanceAdjustmentInput
): Promise<{ id: string; date: string; amount: number; remarks?: string }> {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error("Invalid project ID");
  }

  const allowed = await canAccessProject(actor, projectId);
  if (!allowed) {
    throw new Error("Project not found or access denied");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const amount = Number(input.amount);
  if (isNaN(amount) || amount === 0) {
    throw new Error("Amount must be non-zero (positive to add, negative to subtract)");
  }

  if (!input.date?.trim()) {
    throw new Error("Date is required");
  }

  const newBalance = (project.balance ?? 0) + amount;
  if (newBalance < 0) {
    throw new Error(
      `Cannot add adjustment: project balance would become negative. Current balance: ${(project.balance ?? 0).toLocaleString()}`
    );
  }

  const [doc] = await ProjectBalanceAdjustment.create([
    {
      projectId,
      date: input.date.trim(),
      amount,
      remarks: input.remarks?.trim(),
    },
  ]);

  await Project.findByIdAndUpdate(projectId, { $inc: { balance: amount } });

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "create",
    module: "project_ledger",
    entityId: doc._id.toString(),
    description: `Manual balance adjustment for project: ${amount > 0 ? "+" : ""}${amount}`,
    newValue: { projectId, amount, date: input.date },
  });

  return {
    id: doc._id.toString(),
    date: doc.date,
    amount: doc.amount,
    remarks: doc.remarks,
  };
}

export async function updateProjectBalanceAdjustment(
  actor: { userId: string; email: string; role: string },
  projectId: string,
  adjustmentId: string,
  input: UpdateProjectBalanceAdjustmentInput
): Promise<{ id: string; date: string; amount: number; remarks?: string }> {
  if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(adjustmentId)) {
    throw new Error("Invalid ID");
  }

  const allowed = await canAccessProject(actor, projectId);
  if (!allowed) {
    throw new Error("Project not found or access denied");
  }

  const existing = await ProjectBalanceAdjustment.findOne({
    _id: adjustmentId,
    projectId,
  });
  if (!existing) {
    throw new Error("Adjustment not found");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  // Reverse old amount, apply new amount
  const oldAmount = existing.amount;
  const newAmount = input.amount !== undefined ? Number(input.amount) : oldAmount;
  if (input.amount !== undefined && (isNaN(newAmount) || newAmount === 0)) {
    throw new Error("Amount must be non-zero (positive to add, negative to subtract)");
  }

  const balanceAfterReverse = (project.balance ?? 0) - oldAmount;
  const newBalance = balanceAfterReverse + newAmount;
  if (newBalance < 0) {
    throw new Error(
      `Cannot update adjustment: project balance would become negative.`
    );
  }

  const updates: Record<string, unknown> = {};
  if (input.date !== undefined) updates.date = input.date.trim();
  if (input.amount !== undefined) updates.amount = newAmount;
  if (input.remarks !== undefined) updates.remarks = input.remarks?.trim();

  const updated = await ProjectBalanceAdjustment.findByIdAndUpdate(
    adjustmentId,
    updates,
    { new: true }
  );
  if (!updated) {
    throw new Error("Update failed");
  }

  await Project.findByIdAndUpdate(projectId, {
    $inc: { balance: newAmount - oldAmount },
  });

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "update",
    module: "project_ledger",
    entityId: adjustmentId,
    description: `Updated manual balance adjustment: ${oldAmount} → ${newAmount}`,
    oldValue: { amount: oldAmount },
    newValue: { amount: newAmount },
  });

  return {
    id: updated._id.toString(),
    date: updated.date,
    amount: updated.amount,
    remarks: updated.remarks,
  };
}

export async function deleteProjectBalanceAdjustment(
  actor: { userId: string; email: string; role: string },
  projectId: string,
  adjustmentId: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(adjustmentId)) {
    throw new Error("Invalid ID");
  }

  const allowed = await canAccessProject(actor, projectId);
  if (!allowed) {
    throw new Error("Project not found or access denied");
  }

  const existing = await ProjectBalanceAdjustment.findOne({
    _id: adjustmentId,
    projectId,
  });
  if (!existing) {
    throw new Error("Adjustment not found");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const newBalance = (project.balance ?? 0) - existing.amount;
  if (newBalance < 0) {
    throw new Error(
      `Cannot delete: reversing this adjustment would make project balance negative.`
    );
  }

  await ProjectBalanceAdjustment.findByIdAndDelete(adjustmentId);
  await Project.findByIdAndUpdate(projectId, {
    $inc: { balance: -existing.amount },
  });

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "delete",
    module: "project_ledger",
    entityId: adjustmentId,
    description: `Deleted manual balance adjustment: ${existing.amount}`,
    oldValue: { amount: existing.amount },
  });
}
