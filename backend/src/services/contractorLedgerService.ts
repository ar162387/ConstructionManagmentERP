import mongoose from "mongoose";
import { Contractor } from "../models/Contractor.js";
import { ContractorEntry } from "../models/ContractorEntry.js";
import { ContractorPayment } from "../models/ContractorPayment.js";
import { ContractorPaymentAllocation } from "../models/ContractorPaymentAllocation.js";
import { User } from "../models/User.js";
import { logAudit } from "./auditService.js";
import { roleDisplay } from "./authService.js";
import { getContractorTotals } from "./contractorService.js";
import { rebuildContractorPaymentAllocations } from "./contractorPaymentAllocationService.js";

export interface ContractorLedgerRow {
  type: "entry" | "payment";
  id: string;
  contractorId?: string;
  contractorName?: string;
  date: string;
  amount: number;
  remarks?: string;
  referenceId?: string;
  paymentMethod?: "Cash" | "Bank" | "Online";
}

export interface GetContractorLedgerOptions {
  contractorId?: string;
  page?: number;
  pageSize?: number;
  /** When set (Site Manager), projectId is restricted to actor's assigned project */
  actor?: { userId: string; role: string };
}

const DEFAULT_PAGE_SIZE = 12;

/**
 * Returns unified contractor ledger: entries + payments for a project and month.
 * If contractorId provided, filters by that contractor. Supports pagination.
 * Site Manager: projectId is restricted to actor's assigned project.
 */
export async function getContractorLedger(
  projectId: string,
  month: string,
  options?: GetContractorLedgerOptions
): Promise<{
  rows: ContractorLedgerRow[];
  totalAmount: number;
  totalPaid: number;
  remaining: number;
  total: number;
}> {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return { rows: [], totalAmount: 0, totalPaid: 0, remaining: 0, total: 0 };
  }
  if (options?.actor?.role === "site_manager") {
    const user = await User.findById(options.actor.userId).select("assignedProjectId").lean();
    const assignedProjectId = user?.assignedProjectId?.toString();
    if (!assignedProjectId || assignedProjectId !== projectId) {
      return { rows: [], totalAmount: 0, totalPaid: 0, remaining: 0, total: 0 };
    }
  }
  const monthStart = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

  const projectObjId = new mongoose.Types.ObjectId(projectId);
  const entryMatch: Record<string, unknown> = { projectId: projectObjId, date: { $gte: monthStart, $lte: monthEnd } };
  const paymentMatchBase: Record<string, unknown> = { date: { $gte: monthStart, $lte: monthEnd } };

  if (options?.contractorId && mongoose.Types.ObjectId.isValid(options.contractorId)) {
    const cid = new mongoose.Types.ObjectId(options.contractorId);
    (entryMatch as Record<string, unknown>).contractorId = cid;
    (paymentMatchBase as Record<string, unknown>).contractorId = cid;
  } else {
    // Restrict payments to contractors belonging to this project (ContractorPayment has no projectId)
    const projectContractors = await Contractor.find({ projectId: projectObjId }).select("_id").lean();
    const projectContractorIds = projectContractors.map((c) => c._id);
    (paymentMatchBase as Record<string, unknown>).contractorId = { $in: projectContractorIds };
  }

  const [entries, payments] = await Promise.all([
    ContractorEntry.find(entryMatch).sort({ date: -1 }).lean(),
    ContractorPayment.find(paymentMatchBase).sort({ date: -1 }).lean(),
  ]);

  const cids = [...new Set([...entries.map((e) => e.contractorId.toString()), ...payments.map((p) => p.contractorId.toString())])];
  const contractorDocs = cids.length > 0 ? await Contractor.find({ _id: { $in: cids.map((id) => new mongoose.Types.ObjectId(id)) } }).select("_id name").lean() : [];
  const contractorMap = new Map(contractorDocs.map((c) => [c._id.toString(), c.name]));

  const entryRows: ContractorLedgerRow[] = entries.map((e) => ({
    type: "entry",
    id: e._id.toString(),
    contractorId: e.contractorId?.toString(),
    contractorName: contractorMap.get(e.contractorId.toString()) ?? undefined,
    date: e.date,
    amount: e.amount,
    remarks: e.remarks,
  }));

  const paymentRows: ContractorLedgerRow[] = payments.map((p) => ({
    type: "payment",
    id: p._id.toString(),
    contractorId: p.contractorId?.toString(),
    contractorName: contractorMap.get(p.contractorId.toString()) ?? undefined,
    date: p.date,
    amount: p.amount,
    referenceId: p.referenceId,
    paymentMethod: p.paymentMethod,
  }));

  const totalAmount = entryRows.reduce((s, r) => s + r.amount, 0);

  let totalPaid = 0;
  if (entries.length > 0) {
    const entryIds = entries.map((e) => e._id);
    const allocationSum = await ContractorPaymentAllocation.aggregate([
      { $match: { entryId: { $in: entryIds } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    totalPaid = allocationSum[0]?.total ?? 0;
  }

  const remaining = Math.max(0, totalAmount - totalPaid);

  const allRows = [...entryRows, ...paymentRows].sort((a, b) => b.date.localeCompare(a.date));
  const total = allRows.length;
  const pageSize = Math.min(Math.max(1, options?.pageSize ?? DEFAULT_PAGE_SIZE), 100);
  const page = Math.max(1, options?.page ?? 1);
  const start = (page - 1) * pageSize;
  const rows = allRows.slice(start, start + pageSize);

  return { rows, totalAmount, totalPaid, remaining, total };
}

export interface CreateContractorEntryInput {
  contractorId: string;
  projectId: string;
  date: string;
  amount: number;
  remarks?: string;
}

export async function createContractorEntry(
  actor: { userId: string; email: string; role: string },
  input: CreateContractorEntryInput
): Promise<{ id: string; contractorId: string; date: string; amount: number; remarks: string }> {
  if (!mongoose.Types.ObjectId.isValid(input.contractorId)) throw new Error("Invalid contractor ID");
  if (!input.date) throw new Error("Date is required");
  if (!input.amount || input.amount <= 0) throw new Error("Amount must be positive");

  const contractor = await Contractor.findById(input.contractorId).lean();
  if (!contractor) throw new Error("Contractor not found");

  if (contractor.projectId.toString() !== input.projectId) {
    throw new Error("Contractor does not belong to this project");
  }

  if (actor.role === "site_manager") {
    const user = await User.findById(actor.userId).select("assignedProjectId").lean();
    const assignedProjectId = user?.assignedProjectId?.toString();
    if (!assignedProjectId || assignedProjectId !== input.projectId) {
      throw new Error("You can only add entries for your assigned project");
    }
  }

  const entry = await ContractorEntry.create({
    contractorId: input.contractorId,
    projectId: input.projectId,
    date: input.date,
    amount: input.amount,
    remarks: (input.remarks ?? "").trim(),
  });

  await rebuildContractorPaymentAllocations(input.contractorId);

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "create",
    module: "contractor_entries",
    entityId: entry._id.toString(),
    description: `Added contractor entry: ${contractor.name} — ${input.amount.toLocaleString()} PKR`,
    newValue: { amount: input.amount, contractorId: input.contractorId, date: input.date },
  });

  return {
    id: entry._id.toString(),
    contractorId: input.contractorId,
    date: entry.date,
    amount: entry.amount,
    remarks: entry.remarks ?? "",
  };
}

export interface CreateContractorPaymentInput {
  date: string;
  amount: number;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
}

export async function createContractorPayment(
  actor: { userId: string; email: string; role: string },
  contractorId: string,
  input: CreateContractorPaymentInput
): Promise<{ id: string; contractorId: string; date: string; amount: number; paymentMethod: string; referenceId?: string }> {
  if (!mongoose.Types.ObjectId.isValid(contractorId)) throw new Error("Invalid contractor ID");
  if (!input.date) throw new Error("Date is required");
  if (!input.amount || input.amount <= 0) throw new Error("Amount must be positive");
  if (!["Cash", "Bank", "Online"].includes(input.paymentMethod)) throw new Error("Invalid payment method");

  const contractor = await Contractor.findById(contractorId).lean();
  if (!contractor) throw new Error("Contractor not found");

  if (actor.role === "site_manager") {
    const user = await User.findById(actor.userId).select("assignedProjectId").lean();
    const assignedProjectId = user?.assignedProjectId?.toString();
    if (!assignedProjectId || contractor.projectId.toString() !== assignedProjectId) {
      throw new Error("You can only record payments for contractors in your assigned project");
    }
  }

  const { remaining } = await getContractorTotals(contractorId);
  if (input.amount > remaining) {
    throw new Error(
      `This payment would overpay the contractor. Remaining balance is ${remaining.toLocaleString()} PKR.`
    );
  }

  const payment = await ContractorPayment.create({
    contractorId,
    date: input.date,
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    referenceId: input.referenceId?.trim() || undefined,
  });

  await rebuildContractorPaymentAllocations(contractorId);

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "create",
    module: "contractor_payments",
    entityId: payment._id.toString(),
    description: `Recorded payment: ${contractor.name} — ${input.amount.toLocaleString()} PKR`,
    newValue: { amount: input.amount, contractorId, date: input.date },
  });

  return {
    id: payment._id.toString(),
    contractorId,
    date: payment.date,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    referenceId: payment.referenceId,
  };
}

/** Delete contractor entry. Block if it would create negative remaining (overpay). */
export async function deleteContractorEntry(
  actor: { userId: string; email: string; role: string },
  entryId: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(entryId)) throw new Error("Invalid entry ID");

  const entry = await ContractorEntry.findById(entryId).lean();
  if (!entry) throw new Error("Entry not found");

  const { remaining } = await getContractorTotals(entry.contractorId.toString());
  if (remaining < entry.amount) {
    throw new Error(
      `This update would overpay the contractor. Cannot delete this entry; remaining balance (${remaining.toLocaleString()} PKR) is less than entry amount (${entry.amount.toLocaleString()} PKR).`
    );
  }

  const contractor = await Contractor.findById(entry.contractorId).select("name").lean();
  await ContractorEntry.findByIdAndDelete(entryId);

  await rebuildContractorPaymentAllocations(entry.contractorId.toString());

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "delete",
    module: "contractor_entries",
    entityId: entryId,
    description: `Deleted contractor entry: ${contractor?.name ?? "Unknown"} — ${entry.amount.toLocaleString()} PKR`,
    oldValue: { amount: entry.amount, date: entry.date },
  });
}

/** Delete contractor payment. Always allowed (restores remaining). */
export async function deleteContractorPayment(
  actor: { userId: string; email: string; role: string },
  paymentId: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) throw new Error("Invalid payment ID");

  const payment = await ContractorPayment.findById(paymentId).lean();
  if (!payment) throw new Error("Payment not found");

  const contractor = await Contractor.findById(payment.contractorId).select("name").lean();
  await ContractorPayment.findByIdAndDelete(paymentId);

  await rebuildContractorPaymentAllocations(payment.contractorId.toString());

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "delete",
    module: "contractor_payments",
    entityId: paymentId,
    description: `Deleted contractor payment: ${contractor?.name ?? "Unknown"} — ${payment.amount.toLocaleString()} PKR`,
    oldValue: { amount: payment.amount, date: payment.date },
  });
}
