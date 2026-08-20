import mongoose from "mongoose";
import { Contractor } from "../models/Contractor.js";
import { ContractorEntry } from "../models/ContractorEntry.js";
import { ContractorPayment } from "../models/ContractorPayment.js";
import { User } from "../models/User.js";
import { logAudit, getProjectName } from "./auditService.js";
import { roleDisplay } from "./authService.js";
import { getContractorTotals } from "./contractorService.js";
import { isProjectAssignedToUser } from "./projectAccessService.js";
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
  paymentType?: "settlement" | "advance";
  /** Balance after this transaction, calculated oldest to newest. */
  runningTotal?: number;
}

export interface GetContractorLedgerOptions {
  contractorId?: string;
  page?: number;
  pageSize?: number;
  /** When set (Site Manager), projectId is restricted to actor's assigned project */
  actor?: { userId: string; role: string };
}

export interface GetContractorLedgerAllTimeOptions {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  actor?: { userId: string; role: string };
}

const DEFAULT_PAGE_SIZE = 12;

/** Full contractor history with optional inclusive date range. */
export async function getContractorLedgerAllTime(
  projectId: string,
  contractorId: string,
  options?: GetContractorLedgerAllTimeOptions
): Promise<{ rows: ContractorLedgerRow[]; totalAmount: number; totalPaid: number; total: number; previousBalance: number }> {
  if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(contractorId)) {
    return { rows: [], totalAmount: 0, totalPaid: 0, total: 0, previousBalance: 0 };
  }
  const contractor = await Contractor.findById(contractorId).select("projectId name").lean();
  if (!contractor || contractor.projectId.toString() !== projectId) {
    return { rows: [], totalAmount: 0, totalPaid: 0, total: 0, previousBalance: 0 };
  }
  if (options?.actor?.role === "site_manager") {
    if (!(await isProjectAssignedToUser(options.actor.userId, projectId))) {
      return { rows: [], totalAmount: 0, totalPaid: 0, total: 0, previousBalance: 0 };
    }
  }

  const contractorObjId = new mongoose.Types.ObjectId(contractorId);
  const [entries, payments] = await Promise.all([
    ContractorEntry.find({ projectId: new mongoose.Types.ObjectId(projectId), contractorId: contractorObjId }).sort({ date: 1, _id: 1 }).lean(),
    ContractorPayment.find({ contractorId: contractorObjId }).sort({ date: 1, _id: 1 }).lean(),
  ]);
  const allRows: ContractorLedgerRow[] = [
    ...entries.map((entry) => ({ type: "entry" as const, id: entry._id.toString(), contractorId, contractorName: contractor.name, date: entry.date, amount: entry.amount, remarks: entry.remarks })),
    ...payments.map((payment) => ({ type: "payment" as const, id: payment._id.toString(), contractorId, contractorName: contractor.name, date: payment.date, amount: payment.amount, referenceId: payment.referenceId, paymentMethod: payment.paymentMethod, paymentType: payment.paymentType ?? "settlement" })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  let balance = 0;
  let previousBalance = 0;
  const rangedRows: ContractorLedgerRow[] = [];
  for (const row of allRows) {
    balance += row.type === "entry" ? row.amount : -row.amount;
    if (options?.startDate && row.date < options.startDate) {
      previousBalance = balance;
      continue;
    }
    if (options?.endDate && row.date > options.endDate) continue;
    rangedRows.push({ ...row, runningTotal: balance });
  }
  const totalAmount = rangedRows.reduce((sum, row) => sum + (row.type === "entry" ? row.amount : 0), 0);
  const totalPaid = rangedRows.reduce((sum, row) => sum + (row.type === "payment" ? row.amount : 0), 0);
  const pageSize = Math.min(Math.max(1, options?.pageSize ?? DEFAULT_PAGE_SIZE), 100);
  const page = Math.max(1, options?.page ?? 1);
  const start = (page - 1) * pageSize;
  return { rows: rangedRows.slice(start, start + pageSize), totalAmount, totalPaid, total: rangedRows.length, previousBalance };
}

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
    if (!(await isProjectAssignedToUser(options.actor.userId, projectId))) {
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
    paymentType: p.paymentType ?? "settlement",
  }));

  const totalAmount = entryRows.reduce((s, r) => s + r.amount, 0);

  // Report payments in their own transaction month, including advances that
  // have not yet been allocated to a bill.
  const totalPaid = paymentRows.reduce((sum, row) => sum + row.amount, 0);

  const remaining = totalAmount - totalPaid;

  // Fetch the full history for each displayed contractor so the running total
  // remains correct even when a single month or page is being viewed.
  const historyEntryMatch: Record<string, unknown> = { projectId: projectObjId };
  const historyPaymentMatch: Record<string, unknown> = {};
  if (options?.contractorId && mongoose.Types.ObjectId.isValid(options.contractorId)) {
    const cid = new mongoose.Types.ObjectId(options.contractorId);
    historyEntryMatch.contractorId = cid;
    historyPaymentMatch.contractorId = cid;
  } else {
    const projectContractors = await Contractor.find({ projectId: projectObjId }).select("_id").lean();
    historyPaymentMatch.contractorId = { $in: projectContractors.map((c) => c._id) };
  }
  const [historyEntries, historyPayments] = await Promise.all([
    ContractorEntry.find(historyEntryMatch).sort({ date: 1, _id: 1 }).lean(),
    ContractorPayment.find(historyPaymentMatch).sort({ date: 1, _id: 1 }).lean(),
  ]);
  const balances = new Map<string, number>();
  const runningTotals = new Map<string, number>();
  const historyRows = [
    ...historyEntries.map((entry) => ({ type: "entry" as const, id: entry._id.toString(), contractorId: entry.contractorId.toString(), date: entry.date, amount: entry.amount })),
    ...historyPayments.map((payment) => ({ type: "payment" as const, id: payment._id.toString(), contractorId: payment.contractorId.toString(), date: payment.date, amount: payment.amount })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const row of historyRows) {
    const next = (balances.get(row.contractorId) ?? 0) + (row.type === "entry" ? row.amount : -row.amount);
    balances.set(row.contractorId, next);
    runningTotals.set(`${row.type}-${row.id}`, next);
  }

  const allRows = [...entryRows, ...paymentRows]
    .map((row) => ({ ...row, runningTotal: runningTotals.get(`${row.type}-${row.id}`) ?? 0 }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
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
    if (!(await isProjectAssignedToUser(actor.userId, input.projectId))) {
      throw new Error("You can only add entries for your assigned projects");
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
    projectId: input.projectId,
    projectName: await getProjectName(input.projectId),
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
  paymentType?: "settlement" | "advance";
  referenceId?: string;
}

export async function createContractorPayment(
  actor: { userId: string; email: string; role: string },
  contractorId: string,
  input: CreateContractorPaymentInput
): Promise<{ id: string; contractorId: string; date: string; amount: number; paymentMethod: string; paymentType: "settlement" | "advance"; referenceId?: string }> {
  if (!mongoose.Types.ObjectId.isValid(contractorId)) throw new Error("Invalid contractor ID");
  if (!input.date) throw new Error("Date is required");
  if (!input.amount || input.amount <= 0) throw new Error("Amount must be positive");
  if (!["Cash", "Bank", "Online"].includes(input.paymentMethod)) throw new Error("Invalid payment method");
  const paymentType = input.paymentType ?? "settlement";
  if (!["settlement", "advance"].includes(paymentType)) throw new Error("Invalid payment type");

  const contractor = await Contractor.findById(contractorId).lean();
  if (!contractor) throw new Error("Contractor not found");

  if (actor.role === "site_manager") {
    if (!(await isProjectAssignedToUser(actor.userId, contractor.projectId.toString()))) {
      throw new Error("You can only record payments for contractors in your assigned projects");
    }
  }

  const { remaining } = await getContractorTotals(contractorId);
  if (paymentType === "settlement" && input.amount > remaining) {
    throw new Error(
      `This payment would overpay the contractor. Remaining balance is ${remaining.toLocaleString()} PKR.`
    );
  }

  const payment = await ContractorPayment.create({
    contractorId,
    date: input.date,
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    paymentType,
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
    projectId: contractor.projectId?.toString(),
    projectName: await getProjectName(contractor.projectId?.toString()),
    description: `Recorded ${paymentType === "advance" ? "advance" : "payment"}: ${contractor.name} — ${input.amount.toLocaleString()} PKR`,
    newValue: { amount: input.amount, paymentType, contractorId, date: input.date },
  });

  return {
    id: payment._id.toString(),
    contractorId,
    date: payment.date,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    paymentType: payment.paymentType,
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

  const contractor = await Contractor.findById(entry.contractorId).select("name projectId").lean();
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
    projectId: contractor?.projectId?.toString(),
    projectName: await getProjectName(contractor?.projectId?.toString()),
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

  const contractor = await Contractor.findById(payment.contractorId).select("name projectId").lean();
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
    projectId: contractor?.projectId?.toString(),
    projectName: await getProjectName(contractor?.projectId?.toString()),
    description: `Deleted contractor payment: ${contractor?.name ?? "Unknown"} — ${payment.amount.toLocaleString()} PKR`,
    oldValue: { amount: payment.amount, date: payment.date },
  });
}
