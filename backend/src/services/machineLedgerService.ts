import mongoose from "mongoose";
import { Machine } from "../models/Machine.js";
import { MachineLedgerEntry } from "../models/MachineLedgerEntry.js";
import { MachinePayment } from "../models/MachinePayment.js";
import { MachinePaymentAllocation } from "../models/MachinePaymentAllocation.js";
import { User } from "../models/User.js";
import { logAudit } from "./auditService.js";
import { roleDisplay } from "./authService.js";
import { getMachineTotals } from "./machineService.js";
import { rebuildMachinePaymentAllocations } from "./machinePaymentAllocationService.js";

export interface MachineLedgerEntryRow {
  type: "entry";
  id: string;
  machineId: string;
  date: string;
  hoursWorked: number;
  usedBy?: string;
  totalCost: number;
  paidAmount: number;
  remaining: number;
  remarks?: string;
  /** Cumulative cash paid to the machine as of this row (previousBalance + every payment up to
   *  and including this row). An entry never changes this by itself — same rule as the vendor
   *  ledger's Balance column: a row only adds to the running total when real cash moved. */
  runningTotal: number;
}

/** Separate row for each payment so the ledger shows "on this date, this payment was made" */
export interface MachineLedgerPaymentRow {
  type: "payment";
  id: string;
  date: string;
  amount: number;
  paymentMethod?: "Cash" | "Bank" | "Online";
  referenceId?: string;
  /** Cumulative cash paid to the machine as of this row (previousBalance + every payment up to
   *  and including this row). */
  runningTotal: number;
}

export type MachineLedgerRow = MachineLedgerEntryRow | MachineLedgerPaymentRow;

export interface GetMachineLedgerResult {
  rows: MachineLedgerRow[];
  total: number;
  totalHours: number;
  totalCost: number;
  totalPaid: number;
  remaining: number;
  /** Cumulative cash paid before startDate (0 when no startDate filter is applied). */
  previousBalance: number;
}

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;

export interface CreateMachineEntryInput {
  machineId: string;
  date: string;
  hoursWorked: number;
  usedBy?: string;
  remarks?: string;
}

export interface CreateMachinePaymentInput {
  date: string;
  amount: number;
  paymentMethod?: "Cash" | "Bank" | "Online";
  referenceId?: string;
}

/** Get machine ledger: entries (hours) and payments as separate rows. Payments appear as their own record so "on this date, payment was made". Paginated over combined list.
 * When startDate/endDate are given, rows are filtered to that date range and previousBalance carries the cumulative cash paid before startDate. */
export async function getMachineLedger(
  machineId: string,
  options?: { page?: number; pageSize?: number; startDate?: string; endDate?: string }
): Promise<GetMachineLedgerResult> {
  if (!mongoose.Types.ObjectId.isValid(machineId)) {
    return { rows: [], total: 0, totalHours: 0, totalCost: 0, totalPaid: 0, remaining: 0, previousBalance: 0 };
  }

  const machineObjId = new mongoose.Types.ObjectId(machineId);
  const pageSize = Math.min(Math.max(1, options?.pageSize ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const page = options?.page !== undefined ? Math.max(1, Number(options.page)) : 1;
  const skip = (page - 1) * pageSize;
  const startDate = options?.startDate?.trim() || undefined;
  const endDate = options?.endDate?.trim() || undefined;

  const dateFilter: Record<string, string> = {};
  if (startDate) dateFilter.$gte = startDate;
  if (endDate) dateFilter.$lte = endDate;
  const rangeMatch = Object.keys(dateFilter).length ? { date: dateFilter } : {};

  const [entryDocs, paymentDocs, allocationSums, totals, previousBalance] = await Promise.all([
    MachineLedgerEntry.find({ machineId: machineObjId, ...rangeMatch }).sort({ date: -1, _id: -1 }).lean(),
    MachinePayment.find({ machineId: machineObjId, ...rangeMatch }).sort({ date: -1, _id: -1 }).lean(),
    MachinePaymentAllocation.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { machineId: machineObjId } },
      { $group: { _id: "$entryId", total: { $sum: "$amount" } } },
    ]),
    getMachineTotals(machineId),
    getMachinePreviousBalance(machineObjId, startDate),
  ]);

  const paidByEntry = new Map<string, number>();
  for (const row of allocationSums) {
    paidByEntry.set(row._id.toString(), row.total);
  }

  const entryRows: Omit<MachineLedgerEntryRow, "runningTotal">[] = entryDocs.map((e) => {
    const paidAmount = paidByEntry.get(e._id.toString()) ?? 0;
    const remaining = Math.max(0, e.totalCost - paidAmount);
    return {
      type: "entry",
      id: e._id.toString(),
      machineId: e.machineId.toString(),
      date: e.date,
      hoursWorked: e.hoursWorked,
      usedBy: e.usedBy,
      totalCost: e.totalCost,
      paidAmount,
      remaining,
      remarks: e.remarks,
    };
  });

  const paymentRows: Omit<MachineLedgerPaymentRow, "runningTotal">[] = paymentDocs.map((p) => ({
    type: "payment",
    id: p._id.toString(),
    date: p.date,
    amount: p.amount,
    paymentMethod: p.paymentMethod,
    referenceId: p.referenceId,
  }));

  // Same-row tie-break as the vendor ledger: Mongo ObjectId hex is a creation timestamp, so
  // ordering by id (not by a hardcoded type rule) makes the ascending computation and the
  // descending display agree on which of two same-day rows came first — whichever was created
  // later (e.g. a payment recorded against today's entry) sorts later, so it lands on top in
  // the newest-first display. A hand-rolled "entries always before payments" rule doesn't have
  // that property: it can order the display one way while the running total is computed as if
  // the same-day rows happened in the other order, corrupting the balance shown next to them.
  const ascendingCmp = (a: { date: string; id: string }, b: { date: string; id: string }) =>
    a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
  const descendingCmp = (a: { date: string; id: string }, b: { date: string; id: string }) =>
    b.date.localeCompare(a.date) || b.id.localeCompare(a.id);

  // Running total = cumulative cash actually paid, walked chronologically (ascending) and
  // seeded by previousBalance. An entry (bill for hours worked) never has cash attached to it
  // directly — it only adds to what's owed — so it leaves the running total untouched; only a
  // payment row adds to it. This mirrors the vendor ledger's Balance column exactly.
  const ascending = [...entryRows, ...paymentRows].sort(ascendingCmp);
  const runningTotalByKey = new Map<string, number>();
  let balance = previousBalance;
  for (const row of ascending) {
    if (row.type === "payment") balance += row.amount;
    runningTotalByKey.set(`${row.type}:${row.id}`, balance);
  }

  const allRows: MachineLedgerRow[] = [...entryRows, ...paymentRows]
    .sort(descendingCmp)
    .map((row) => ({ ...row, runningTotal: runningTotalByKey.get(`${row.type}:${row.id}`) ?? previousBalance } as MachineLedgerRow));

  const total = allRows.length;
  const rows = allRows.slice(skip, skip + pageSize);

  return {
    rows,
    total,
    totalHours: totals.totalHours,
    totalCost: totals.totalCost,
    totalPaid: totals.totalPaid,
    remaining: totals.remaining,
    previousBalance,
  };
}

/** Cumulative cash paid to a machine before startDate (0 when startDate is not given).
 * Same rule as the running total itself: only payments count, entries never do. */
async function getMachinePreviousBalance(machineObjId: mongoose.Types.ObjectId, startDate?: string): Promise<number> {
  if (!startDate) return 0;
  const [paymentAgg] = await MachinePayment.aggregate<{ sum: number }>([
    { $match: { machineId: machineObjId, date: { $lt: startDate } } },
    { $group: { _id: null, sum: { $sum: "$amount" } } },
  ]);
  return paymentAgg?.sum ?? 0;
}

/** Create ledger entry (hours worked). totalCost = hoursWorked * machine.hourlyRate at creation time. */
export async function createMachineEntry(
  actor: { userId: string; email: string; role: string },
  input: CreateMachineEntryInput
): Promise<MachineLedgerEntryRow> {
  if (!mongoose.Types.ObjectId.isValid(input.machineId)) throw new Error("Invalid machine ID");
  if (!input.date?.trim()) throw new Error("Date is required");
  const hours = Number(input.hoursWorked);
  if (isNaN(hours) || hours <= 0) throw new Error("Hours worked must be a positive number");

  const machine = await Machine.findById(input.machineId).lean();
  if (!machine) throw new Error("Machine not found");

  if (actor.role === "site_manager") {
    const user = await User.findById(actor.userId).select("assignedProjectId").lean();
    const assignedProjectId = user?.assignedProjectId?.toString();
    if (!assignedProjectId || machine.projectId.toString() !== assignedProjectId) {
      throw new Error("You can only add entries for machines in your assigned project");
    }
  }

  const totalCost = Math.round(hours * machine.hourlyRate * 100) / 100;

  const entry = await MachineLedgerEntry.create({
    machineId: input.machineId,
    projectId: machine.projectId,
    date: input.date.trim(),
    hoursWorked: hours,
    usedBy: input.usedBy?.trim() || undefined,
    totalCost,
    remarks: input.remarks?.trim() || undefined,
  });

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "create",
    module: "machinery_ledger",
    entityId: entry._id.toString(),
    description: `Machine ledger entry: ${machine.name} — ${hours} hrs`,
    newValue: { hoursWorked: hours, totalCost, date: entry.date },
  });

  return {
    type: "entry",
    id: entry._id.toString(),
    machineId: entry.machineId.toString(),
    date: entry.date,
    hoursWorked: entry.hoursWorked,
    usedBy: entry.usedBy,
    totalCost: entry.totalCost,
    paidAmount: 0,
    remaining: entry.totalCost,
    remarks: entry.remarks,
    // Caller should refetch the ledger for an accurate running balance; this return value is used
    // only for immediate optimistic display of the single created row.
    runningTotal: entry.totalCost,
  };
}

/** Create payment and allocate FIFO to oldest unpaid entries. */
export async function createMachinePayment(
  actor: { userId: string; email: string; role: string },
  machineId: string,
  input: CreateMachinePaymentInput
): Promise<{ id: string; machineId: string; date: string; amount: number }> {
  if (!mongoose.Types.ObjectId.isValid(machineId)) throw new Error("Invalid machine ID");
  if (!input.date?.trim()) throw new Error("Date is required");
  const amount = Number(input.amount);
  if (isNaN(amount) || amount <= 0) throw new Error("Amount must be a positive number");

  const machine = await Machine.findById(machineId).lean();
  if (!machine) throw new Error("Machine not found");

  if (actor.role === "site_manager") {
    const user = await User.findById(actor.userId).select("assignedProjectId").lean();
    const assignedProjectId = user?.assignedProjectId?.toString();
    if (!assignedProjectId || machine.projectId.toString() !== assignedProjectId) {
      throw new Error("You can only record payments for machines in your assigned project");
    }
  }

  // Payments are allowed to exceed the remaining balance — the excess is simply carried as an
  // advance against future hours worked, rather than being rejected as an overpayment.
  const payment = await MachinePayment.create({
    machineId,
    date: input.date.trim(),
    amount,
    paymentMethod: input.paymentMethod,
    referenceId: input.referenceId?.trim() || undefined,
  });

  await rebuildMachinePaymentAllocations(machineId);

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "create",
    module: "machinery_payments",
    entityId: payment._id.toString(),
    description: `Machine payment: ${machine.name} — ${amount.toLocaleString()} PKR`,
    newValue: { amount, machineId, date: payment.date },
  });

  return {
    id: payment._id.toString(),
    machineId,
    date: payment.date,
    amount: payment.amount,
  };
}

/** Delete ledger entry; reverse financial impact and rebuild FIFO. Payments already recorded
 * against this machine are never blocked by this — any amount left over from the deleted entry's
 * cost is simply carried forward as advance, same as an intentional overpayment. */
export async function deleteMachineEntry(
  actor: { userId: string; email: string; role: string },
  entryId: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(entryId)) throw new Error("Invalid entry ID");

  const entry = await MachineLedgerEntry.findById(entryId).lean();
  if (!entry) throw new Error("Entry not found");

  const machine = await Machine.findById(entry.machineId).select("name").lean();

  await MachineLedgerEntry.findByIdAndDelete(entryId);
  await MachinePaymentAllocation.deleteMany({ entryId: new mongoose.Types.ObjectId(entryId) });

  await rebuildMachinePaymentAllocations(entry.machineId.toString());

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "delete",
    module: "machinery_ledger",
    entityId: entryId,
    description: `Deleted machine ledger entry: ${machine?.name ?? "Unknown"} — ${entry.hoursWorked} hrs, ${entry.totalCost.toLocaleString()} PKR`,
    oldValue: { totalCost: entry.totalCost, date: entry.date },
  });
}

/** Delete payment; remove payment and its allocations, rebuild FIFO for the machine. */
export async function deleteMachinePayment(
  actor: { userId: string; email: string; role: string },
  paymentId: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) throw new Error("Invalid payment ID");

  const payment = await MachinePayment.findById(paymentId).lean();
  if (!payment) throw new Error("Payment not found");

  const machine = await Machine.findById(payment.machineId).select("name").lean();

  await MachinePayment.findByIdAndDelete(paymentId);
  await MachinePaymentAllocation.deleteMany({ paymentId: new mongoose.Types.ObjectId(paymentId) });

  await rebuildMachinePaymentAllocations(payment.machineId.toString());

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "delete",
    module: "machinery_payments",
    entityId: paymentId,
    description: `Deleted machine payment: ${machine?.name ?? "Unknown"} — ${payment.amount.toLocaleString()} PKR`,
    oldValue: { amount: payment.amount, date: payment.date },
  });
}
