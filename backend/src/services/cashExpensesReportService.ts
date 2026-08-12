import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { BankAccount } from "../models/BankAccount.js";
import { ItemLedgerEntry } from "../models/ItemLedgerEntry.js";
import { VendorPayment } from "../models/VendorPayment.js";
import { ContractorPayment } from "../models/ContractorPayment.js";
import { EmployeePayment } from "../models/EmployeePayment.js";
import { Expense } from "../models/Expense.js";
import { MachinePayment } from "../models/MachinePayment.js";
import { NonConsumableLedgerEntry } from "../models/NonConsumableLedgerEntry.js";
import { User } from "../models/User.js";
import { BankTransaction } from "../models/BankTransaction.js";
import { ProjectBalanceAdjustment } from "../models/ProjectBalanceAdjustment.js";
import { Vendor } from "../models/Vendor.js";
import { Contractor } from "../models/Contractor.js";
import { Employee } from "../models/Employee.js";
import { Machine } from "../models/Machine.js";
import { ConsumableItem } from "../models/ConsumableItem.js";
import { NonConsumableItem } from "../models/NonConsumableItem.js";

export type CashExpensesEntityType =
  | "Consumable"
  | "NonConsumable"
  | "Vendor"
  | "Contractor"
  | "Salary"
  | "Expense"
  | "Machinery";

export interface CashExpensesReportPayment {
  entityName: string;
  entityType: CashExpensesEntityType;
  /** Amount paid in the selected period (this line). */
  amount: number;
  /** Running balance before this line: all prior days + earlier lines same entity on this day. */
  previousAmount: number;
  /** previousAmount + amount (cumulative after this line). */
  totalAmount: number;
  remarks: string;
  sourceId?: string;
  /** The entity's id (hex for db entities; category string for Expense; "ALL" for Salary). */
  entityId: string;
}

export interface CashExpensesLedgerEntry {
  id: string;
  date: string;
  name: string;
  remarks: string;
  amount: number;
}

export interface CashExpensesEntityLedger {
  entityName: string;
  entityType: CashExpensesEntityType;
  previousAmount: number;
  entries: CashExpensesLedgerEntry[];
  currentTotal: number;
}

export interface CashExpensesReportBankAccount {
  id: string;
  name: string;
  openingBalance: number;
  closingBalance: number;
  inflows: number;
}

export interface CashExpensesReportOpeningBalances {
  projectLedger: number;
  projectLedgerClosing: number;
  projectLedgerInflows: number;
  openingRow: {
    current: number;
    previous: number;
    total: number;
    tPayment: number;
  };
  inflowTransactions: {
    id: string;
    date: string;
    source: string;
    remarks: string;
    current: number;
    previous: number;
    total: number;
    tPayment: number;
  }[];
}

export interface CashExpensesReport {
  openingBalances: CashExpensesReportOpeningBalances;
  payments: CashExpensesReportPayment[];
  totalPayments: number;
  closingBalance: number;
}

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

function joinRemarks(...parts: (string | undefined | null)[]): string {
  return parts.filter(Boolean).join(" — ") || "";
}

type InternalPayment = {
  entityName: string;
  entityType: CashExpensesEntityType;
  amount: number;
  remarks: string;
  sourceId: string;
  entityKey: string;
};

/** Lean populate may be ObjectId or { _id, name, ... }. */
function populatedIdName(ref: unknown): { id: string; name?: string } {
  if (!ref) return { id: "" };
  if (ref instanceof mongoose.Types.ObjectId) return { id: ref.toString() };
  if (typeof ref === "object" && "_id" in ref) {
    const o = ref as { _id?: mongoose.Types.ObjectId; name?: string };
    return { id: o._id?.toString() ?? "", name: o.name };
  }
  return { id: "" };
}

type PriorEntityTotal = { name: string; amount: number };

/**
 * Every entity this project has ever paid before `startDate`, with its all-time prior total.
 *
 * Deliberately NOT filtered to entities active in the selected range: the sheet's
 * self-validating identity requires the Previous column to sum to *all* payments made
 * before the range, so an entity paid last month but not today still needs its row
 * (Current "-", Previous carried forward). Without those rows,
 * `inflowsBeforeStart - sum(Previous)` no longer reproduces the opening cash balance.
 */
async function fetchAllPriorPaymentTotals(
  projectObj: mongoose.Types.ObjectId,
  startDate: string
): Promise<Map<string, PriorEntityTotal>> {
  const out = new Map<string, PriorEntityTotal>();
  const add = (key: string, amount: number, name?: string | null) => {
    const cur = out.get(key);
    if (cur) {
      cur.amount += amount;
      if (!cur.name && name) cur.name = name;
    } else {
      out.set(key, { name: name ?? "", amount });
    }
  };

  const vendorsColl = Vendor.collection.name;
  const contractorsColl = Contractor.collection.name;
  const machinesColl = Machine.collection.name;
  const consumablesColl = ConsumableItem.collection.name;
  const nonConsumablesColl = NonConsumableItem.collection.name;

  type IdSumName = { _id: mongoose.Types.ObjectId; sum: number; name?: string };

  const beforeStart = { $lt: startDate } as const;

  const [
    consumableRows,
    vendorPayRows,
    vendorAdvanceRows,
    contractorRows,
    salaryRows,
    expenseRows,
    machineRows,
    nonConsumableRows,
  ] = await Promise.all([
    ItemLedgerEntry.aggregate<IdSumName>([
      { $match: { projectId: projectObj, date: beforeStart, paidAmount: { $gt: 0 } } },
      { $group: { _id: "$itemId", sum: { $sum: "$paidAmount" } } },
      { $lookup: { from: consumablesColl, localField: "_id", foreignField: "_id", as: "e" } },
      { $unwind: { path: "$e", preserveNullAndEmptyArrays: true } },
      { $project: { sum: 1, name: "$e.name" } },
    ]),
    // Advance-sourced payments are a reallocation of money already counted when the
    // advance was originally generated, not new cash out — excluded here.
    VendorPayment.aggregate<IdSumName>([
      { $match: { date: beforeStart, source: { $ne: "advance" } } },
      { $lookup: { from: vendorsColl, localField: "vendorId", foreignField: "_id", as: "v" } },
      { $unwind: "$v" },
      { $match: { "v.projectId": projectObj } },
      { $group: { _id: "$vendorId", sum: { $sum: "$amount" }, name: { $first: "$v.name" } } },
    ]),
    ItemLedgerEntry.aggregate<IdSumName>([
      {
        $match: {
          projectId: projectObj,
          date: beforeStart,
          advanceGenerated: { $gt: 0 },
          vendorId: { $ne: null },
        },
      },
      { $group: { _id: "$vendorId", sum: { $sum: "$advanceGenerated" } } },
      { $lookup: { from: vendorsColl, localField: "_id", foreignField: "_id", as: "e" } },
      { $unwind: { path: "$e", preserveNullAndEmptyArrays: true } },
      { $project: { sum: 1, name: "$e.name" } },
    ]),
    ContractorPayment.aggregate<IdSumName>([
      { $match: { date: beforeStart } },
      { $lookup: { from: contractorsColl, localField: "contractorId", foreignField: "_id", as: "c" } },
      { $unwind: "$c" },
      { $match: { "c.projectId": projectObj } },
      { $group: { _id: "$contractorId", sum: { $sum: "$amount" }, name: { $first: "$c.name" } } },
    ]),
    Employee.find({ projectId: projectObj })
      .distinct("_id")
      .then((employeeIds) =>
        EmployeePayment.aggregate<{ sum: number }>([
          { $match: { employeeId: { $in: employeeIds }, date: beforeStart } },
          { $group: { _id: null, sum: { $sum: "$amount" } } },
        ])
      ),
    Expense.aggregate<{ _id: string; sum: number }>([
      { $match: { projectId: projectObj, date: beforeStart } },
      { $group: { _id: { $trim: { input: "$category" } }, sum: { $sum: "$amount" } } },
    ]),
    MachinePayment.aggregate<IdSumName>([
      { $match: { date: beforeStart } },
      { $lookup: { from: machinesColl, localField: "machineId", foreignField: "_id", as: "m" } },
      { $unwind: "$m" },
      { $match: { "m.projectId": projectObj } },
      { $group: { _id: "$machineId", sum: { $sum: "$amount" }, name: { $first: "$m.name" } } },
    ]),
    NonConsumableLedgerEntry.aggregate<IdSumName>([
      {
        $match: {
          date: beforeStart,
          totalCost: { $gt: 0 },
          // Older entries predate expenseProjectId; retain them by using the project that was
          // previously stored on the movement itself. New entries use expenseProjectId.
          $or: [
            { expenseProjectId: projectObj },
            { expenseProjectId: { $exists: false }, projectTo: projectObj },
            { expenseProjectId: { $exists: false }, projectFrom: projectObj },
          ],
        },
      },
      { $lookup: { from: nonConsumablesColl, localField: "itemId", foreignField: "_id", as: "e" } },
      { $unwind: { path: "$e", preserveNullAndEmptyArrays: true } },
      { $group: { _id: "$e.category", sum: { $sum: "$totalCost" } } },
      { $project: { sum: 1, name: "$_id" } },
    ]),
  ]);

  for (const r of consumableRows) add(`Consumable:${r._id.toString()}`, r.sum, r.name);
  for (const r of vendorPayRows) add(`Vendor:${r._id.toString()}`, r.sum, r.name);
  for (const r of vendorAdvanceRows) add(`Vendor:${r._id.toString()}`, r.sum, r.name);
  for (const r of contractorRows) add(`Contractor:${r._id.toString()}`, r.sum, r.name);
  for (const r of machineRows) add(`Machinery:${r._id.toString()}`, r.sum, r.name);
  for (const r of nonConsumableRows) {
    const category = r._id?.toString();
    if (category) add(`NonConsumable:${category}`, r.sum, r.name);
  }
  for (const r of expenseRows) {
    if (!r._id) continue;
    add(`Expense:${r._id}`, r.sum, r._id);
  }
  const salaryPrior = salaryRows[0]?.sum ?? 0;
  if (salaryPrior > 0) add("Salary:ALL", salaryPrior, "Employees");

  return out;
}

/** Aggregate many payments into one InternalPayment per entity. Remarks are dropped. */
function pushAggregatedByEntity(
  internal: InternalPayment[],
  entries: { id: string; name?: string; amount: number }[],
  entityType: CashExpensesEntityType,
  fallbackName: string
) {
  const byEntity = new Map<string, { name: string; total: number }>();
  for (const e of entries) {
    if (!e.id) continue;
    const cur = byEntity.get(e.id);
    if (cur) cur.total += e.amount;
    else byEntity.set(e.id, { name: e.name ?? fallbackName, total: e.amount });
  }
  for (const [id, { name, total }] of byEntity) {
    internal.push({
      entityName: name,
      entityType,
      amount: total,
      remarks: "",
      sourceId: `${entityType}-${id}`,
      entityKey: `${entityType}:${id}`,
    });
  }
}

function applyRunningPreviousAndTotal(
  rows: InternalPayment[],
  priorTotals: Map<string, number>
): CashExpensesReportPayment[] {
  const sorted = [...rows].sort((a, b) => {
    const k = a.entityKey.localeCompare(b.entityKey);
    if (k !== 0) return k;
    return a.sourceId.localeCompare(b.sourceId);
  });
  const sameDayRunning = new Map<string, number>();
  const result: CashExpensesReportPayment[] = [];
  for (const row of sorted) {
    const prior = priorTotals.get(row.entityKey) ?? 0;
    const earlierToday = sameDayRunning.get(row.entityKey) ?? 0;
    const previousAmount = prior + earlierToday;
    const totalAmount = previousAmount + row.amount;
    sameDayRunning.set(row.entityKey, earlierToday + row.amount);
    result.push({
      entityName: row.entityName,
      entityType: row.entityType,
      amount: row.amount,
      previousAmount,
      totalAmount,
      remarks: row.remarks,
      sourceId: row.sourceId,
      entityId: row.entityKey.slice(row.entityKey.indexOf(":") + 1),
    });
  }
  return result;
}

async function fetchProjectInflowsBeforeDate(
  projectObj: mongoose.Types.ObjectId,
  startDate: string
): Promise<number> {
  const [bankInflowsToProject, projectLedgerAdjustments] = await Promise.all([
    BankTransaction.aggregate<{ sum: number }>([
      {
        $match: {
          projectId: projectObj,
          type: "outflow",
          date: { $lt: startDate },
        },
      },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]),
    ProjectBalanceAdjustment.aggregate<{ sum: number }>([
      {
        $match: {
          projectId: projectObj,
          date: { $lt: startDate },
          amount: { $gt: 0 },
        },
      },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]),
  ]);

  return (bankInflowsToProject[0]?.sum ?? 0) + (projectLedgerAdjustments[0]?.sum ?? 0);
}

export async function getCashExpensesReport(
  actor: { userId: string; role: string },
  projectId: string,
  startDate: string,
  endDate: string
): Promise<CashExpensesReport> {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error("Invalid project ID");
  }
  const projectObj = new mongoose.Types.ObjectId(projectId);

  const project = await Project.findById(projectId).lean();
  if (!project) {
    throw new Error("Project not found");
  }

  const allowed = await canAccessProject(actor, projectId);
  if (!allowed) {
    throw new Error("Project not found or access denied");
  }

  const inRange = { $gte: startDate, $lte: endDate } as const;

  const [
    bankAccounts,
    bankOutflowsToProjectTxs,
    projectAdjustmentsInflowsRows,
    consumablePayments,
    vendorPayments,
    vendorAdvanceFromPurchases,
    contractorPayments,
    employeePayments,
    expenses,
    machinePayments,
    nonConsumablePayments,
    inflowsBeforeStartDate,
  ] = await Promise.all([
    BankAccount.find({}).select("_id name").lean(),
    BankTransaction.find({ projectId: projectObj, type: "outflow", date: inRange }).lean(),
    ProjectBalanceAdjustment.find({ projectId: projectObj, date: inRange }).lean(),
    ItemLedgerEntry.find({ projectId: projectObj, date: inRange, paidAmount: { $gt: 0 } })
      .populate<{ itemId: { name: string; category: string } }>("itemId", "name category")
      .lean(),
    VendorPayment.find({ date: inRange, source: { $ne: "advance" } })
      .populate<{ vendorId: { projectId: mongoose.Types.ObjectId; name: string } }>("vendorId", "projectId name")
      .lean()
      .then((rows) => rows.filter((r) => r.vendorId?.projectId?.toString() === projectId)),
    ItemLedgerEntry.find({ projectId: projectObj, date: inRange, advanceGenerated: { $gt: 0 } })
      .populate<{ vendorId: { name: string } }>("vendorId", "name")
      .lean(),
    ContractorPayment.find({ date: inRange })
      .populate<{ contractorId: { projectId: mongoose.Types.ObjectId; name: string } }>("contractorId", "projectId name")
      .lean()
      .then((rows) => rows.filter((r) => r.contractorId?.projectId?.toString() === projectId)),
    EmployeePayment.find({ date: inRange })
      .populate<{ employeeId: { projectId: mongoose.Types.ObjectId; name: string } }>("employeeId", "projectId name")
      .lean()
      .then((rows) => rows.filter((r) => r.employeeId?.projectId?.toString() === projectId)),
    Expense.find({ projectId: projectObj, date: inRange }).lean(),
    MachinePayment.find({ date: inRange })
      .populate<{ machineId: { projectId: mongoose.Types.ObjectId; name: string } }>("machineId", "projectId name")
      .lean()
      .then((rows) => rows.filter((r) => r.machineId?.projectId?.toString() === projectId)),
    NonConsumableLedgerEntry.find({
      date: inRange,
      totalCost: { $gt: 0 },
      $or: [
        { expenseProjectId: projectObj },
        { expenseProjectId: { $exists: false }, projectTo: projectObj },
        { expenseProjectId: { $exists: false }, projectFrom: projectObj },
      ],
    })
      .populate<{ itemId: { name: string; category: string } }>("itemId", "name category")
      .lean(),
    fetchProjectInflowsBeforeDate(projectObj, startDate),
  ]);

  const internal: InternalPayment[] = [];

  pushAggregatedByEntity(
    internal,
    consumablePayments.map((row) => ({ ...populatedIdName(row.itemId), amount: row.paidAmount })),
    "Consumable",
    "Consumable"
  );

  pushAggregatedByEntity(
    internal,
    [
      ...vendorPayments.map((row) => ({ ...populatedIdName(row.vendorId), amount: row.amount })),
      // Overpaying a consumable bill beyond its total is also real cash paid to the vendor
      // that day (recorded as advance) — folded into the same vendor bucket as payments.
      ...vendorAdvanceFromPurchases.map((row) => ({ ...populatedIdName(row.vendorId), amount: row.advanceGenerated })),
    ],
    "Vendor",
    "Vendor"
  );

  pushAggregatedByEntity(
    internal,
    contractorPayments.map((row) => ({ ...populatedIdName(row.contractorId), amount: row.amount })),
    "Contractor",
    "Contractor"
  );

  if (employeePayments.length > 0) {
    const totalEmployeeAmount = employeePayments.reduce((s, r) => s + r.amount, 0);
    internal.push({
      entityName: "Employees",
      entityType: "Salary",
      amount: totalEmployeeAmount,
      remarks: "",
      sourceId: "salary-all",
      entityKey: "Salary:ALL",
    });
  }

  const expenseByCat = new Map<string, { name: string; total: number }>();
  for (const row of expenses) {
    const cat = row.category.trim();
    const e = expenseByCat.get(cat);
    if (e) e.total += row.amount;
    else expenseByCat.set(cat, { name: row.category || row.description, total: row.amount });
  }
  for (const [cat, { name, total }] of expenseByCat) {
    internal.push({
      entityName: name,
      entityType: "Expense",
      amount: total,
      remarks: "",
      sourceId: `expense-cat-${cat}`,
      entityKey: `Expense:${cat}`,
    });
  }

  pushAggregatedByEntity(
    internal,
    machinePayments.map((row) => ({ ...populatedIdName(row.machineId), amount: row.amount })),
    "Machinery",
    "Machinery"
  );

  const nonConsumableByCategory = new Map<string, number>();
  for (const row of nonConsumablePayments) {
    const category = (row.itemId as unknown as { category?: string } | null)?.category?.trim();
    if (!category || (row.totalCost ?? 0) <= 0) continue;
    nonConsumableByCategory.set(category, (nonConsumableByCategory.get(category) ?? 0) + (row.totalCost ?? 0));
  }
  for (const [category, amount] of nonConsumableByCategory) {
    internal.push({
      entityName: category,
      entityType: "NonConsumable",
      amount,
      remarks: "",
      sourceId: `non-consumable-category-${category}`,
      entityKey: `NonConsumable:${category}`,
    });
  }

  const priorByEntity = await fetchAllPriorPaymentTotals(projectObj, startDate);

  // Carry forward every entity paid before the range, even with no activity in it. These
  // rows show Current "-" and keep the Previous column complete, which is what makes
  // `receipts − payments` reproduce the opening balance in the Previous column.
  const keysWithCurrentActivity = new Set(internal.map((r) => r.entityKey));
  for (const [entityKey, { name, amount }] of priorByEntity) {
    if (amount <= 0 || keysWithCurrentActivity.has(entityKey)) continue;
    const entityType = entityKey.slice(0, entityKey.indexOf(":")) as CashExpensesEntityType;
    internal.push({
      entityName: name || entityType,
      entityType,
      amount: 0,
      remarks: "",
      sourceId: `carry-${entityKey}`,
      entityKey,
    });
  }

  const priorTotals = new Map<string, number>(
    [...priorByEntity].map(([key, { amount }]) => [key, amount])
  );

  const payments = applyRunningPreviousAndTotal(internal, priorTotals);
  /** All cash paid out by this project before `startDate` — equals the Previous column total. */
  const priorPaymentsTotal = [...priorByEntity.values()].reduce((s, e) => s + e.amount, 0);

  const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
  const projectLedgerClosing = project.balance ?? 0;
  const bankNameById: Record<string, string> = {};
  for (const acc of bankAccounts) {
    bankNameById[acc._id.toString()] = acc.name;
  }
  const bankOutflowsToProjectRange = bankOutflowsToProjectTxs.reduce((s, t) => s + t.amount, 0);
  const projectAdjustmentsInflowsRange = projectAdjustmentsInflowsRows
    .filter((r) => r.amount > 0)
    .reduce((s, r) => s + r.amount, 0);
  const projectLedgerInflows = bankOutflowsToProjectRange + projectAdjustmentsInflowsRange;
  const inflowTransactions = [
    ...bankOutflowsToProjectTxs.map((tx) => {
      const accountId = tx.accountId.toString();
      const current = tx.amount;
      const previous = 0;
      const total = current + previous;
      return {
        id: `bank-${tx._id.toString()}`,
        date: tx.date,
        source: bankNameById[accountId] ?? "Bank Account",
        remarks: joinRemarks(tx.referenceId, tx.remarks),
        current,
        previous,
        total,
        tPayment: total,
      };
    }),
    ...projectAdjustmentsInflowsRows
      .filter((r) => r.amount > 0)
      .map((r) => {
        const current = r.amount;
        const previous = 0;
        const total = current + previous;
        return {
          id: `adj-${r._id.toString()}`,
          date: r.date,
          source: "",
          remarks: r.remarks?.trim() ?? "",
          current,
          previous,
          total,
          tPayment: total,
        };
      }),
  ].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.id.localeCompare(b.id);
  });
  // Project: opening + inflows in selected period - total payments in selected period = closing
  const projectLedgerOpening = projectLedgerClosing - projectLedgerInflows + totalPayments;

  // Cash carried into the range = every rupee received before it, minus every rupee paid
  // out before it. This is the same number the previous day's report showed as its Day
  // Closing Balance, so consecutive sheets chain without any stored state.
  const openingRowCurrent = 0;
  const openingRowPrevious = inflowsBeforeStartDate - priorPaymentsTotal;
  const openingRowTotal = openingRowPrevious;
  const openingRowTPayment = inflowsBeforeStartDate;

  const closingBalance = openingRowPrevious + projectLedgerInflows - totalPayments;

  const openingBalances: CashExpensesReportOpeningBalances = {
    projectLedger: projectLedgerOpening,
    projectLedgerClosing,
    projectLedgerInflows,
    openingRow: {
      current: openingRowCurrent,
      previous: openingRowPrevious,
      total: openingRowTotal,
      tPayment: openingRowTPayment,
    },
    inflowTransactions,
  };

  return {
    openingBalances,
    payments,
    totalPayments,
    closingBalance,
  };
}

export async function getCashExpensesEntityLedger(
  actor: { userId: string; role: string },
  projectId: string,
  entityType: CashExpensesEntityType,
  entityId: string,
  startDate: string,
  endDate: string
): Promise<CashExpensesEntityLedger> {
  if (!mongoose.Types.ObjectId.isValid(projectId)) throw new Error("Invalid project ID");
  const projectObj = new mongoose.Types.ObjectId(projectId);

  const allowed = await canAccessProject(actor, projectId);
  if (!allowed) throw new Error("Project not found or access denied");

  const inRange = { $gte: startDate, $lte: endDate } as const;

  const vendorsColl = Vendor.collection.name;
  const contractorsColl = Contractor.collection.name;
  const machinesColl = Machine.collection.name;

  if (entityType === "Consumable") {
    if (!mongoose.Types.ObjectId.isValid(entityId)) throw new Error("Invalid entity ID");
    const itemObj = new mongoose.Types.ObjectId(entityId);
    const [item, docs, prevAgg] = await Promise.all([
      ConsumableItem.findById(itemObj).select("name").lean(),
      ItemLedgerEntry.find({ projectId: projectObj, itemId: itemObj, date: inRange, paidAmount: { $gt: 0 } })
        .sort({ date: 1, createdAt: 1 })
        .lean(),
      ItemLedgerEntry.aggregate<{ sum: number }>([
        { $match: { projectId: projectObj, itemId: itemObj, date: { $lt: startDate }, paidAmount: { $gt: 0 } } },
        { $group: { _id: null, sum: { $sum: "$paidAmount" } } },
      ]),
    ]);
    const entries: CashExpensesLedgerEntry[] = docs.map((d) => ({
      id: d._id.toString(),
      date: d.date,
      name: "",
      remarks: joinRemarks(d.referenceId, d.remarks),
      amount: d.paidAmount,
    }));
    return {
      entityName: item?.name ?? "Consumable",
      entityType,
      previousAmount: prevAgg[0]?.sum ?? 0,
      entries,
      currentTotal: entries.reduce((s, e) => s + e.amount, 0),
    };
  }

  if (entityType === "Vendor") {
    if (!mongoose.Types.ObjectId.isValid(entityId)) throw new Error("Invalid entity ID");
    const vendorObj = new mongoose.Types.ObjectId(entityId);
    const [vendor, payDocs, advDocs, payPrevAgg, advPrevAgg] = await Promise.all([
      Vendor.findById(vendorObj).select("name").lean(),
      // Advance-sourced payments reallocate money already counted when generated — excluded.
      VendorPayment.find({ vendorId: vendorObj, date: inRange, source: { $ne: "advance" } })
        .sort({ date: 1, createdAt: 1 })
        .lean(),
      ItemLedgerEntry.find({ projectId: projectObj, vendorId: vendorObj, date: inRange, advanceGenerated: { $gt: 0 } })
        .populate<{ itemId: { name: string } }>("itemId", "name")
        .sort({ date: 1, createdAt: 1 })
        .lean(),
      VendorPayment.aggregate<{ sum: number }>([
        { $match: { vendorId: vendorObj, date: { $lt: startDate }, source: { $ne: "advance" } } },
        { $lookup: { from: vendorsColl, localField: "vendorId", foreignField: "_id", as: "v" } },
        { $unwind: "$v" },
        { $match: { "v.projectId": projectObj } },
        { $group: { _id: null, sum: { $sum: "$amount" } } },
      ]),
      ItemLedgerEntry.aggregate<{ sum: number }>([
        { $match: { projectId: projectObj, vendorId: vendorObj, date: { $lt: startDate }, advanceGenerated: { $gt: 0 } } },
        { $group: { _id: null, sum: { $sum: "$advanceGenerated" } } },
      ]),
    ]);
    const entries: CashExpensesLedgerEntry[] = [
      ...payDocs.map((d) => ({
        id: d._id.toString(),
        date: d.date,
        name: "",
        remarks: joinRemarks(d.referenceId, d.remarks),
        amount: d.amount,
      })),
      ...advDocs.map((d) => ({
        id: d._id.toString(),
        date: d.date,
        name: "",
        remarks: joinRemarks("Advance", populatedIdName(d.itemId).name),
        amount: d.advanceGenerated,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    return {
      entityName: vendor?.name ?? "Vendor",
      entityType,
      previousAmount: (payPrevAgg[0]?.sum ?? 0) + (advPrevAgg[0]?.sum ?? 0),
      entries,
      currentTotal: entries.reduce((s, e) => s + e.amount, 0),
    };
  }

  if (entityType === "Contractor") {
    if (!mongoose.Types.ObjectId.isValid(entityId)) throw new Error("Invalid entity ID");
    const contractorObj = new mongoose.Types.ObjectId(entityId);
    const [contractor, docs, prevAgg] = await Promise.all([
      Contractor.findById(contractorObj).select("name").lean(),
      ContractorPayment.find({ contractorId: contractorObj, date: inRange }).sort({ date: 1, createdAt: 1 }).lean(),
      ContractorPayment.aggregate<{ sum: number }>([
        { $match: { contractorId: contractorObj, date: { $lt: startDate } } },
        { $lookup: { from: contractorsColl, localField: "contractorId", foreignField: "_id", as: "c" } },
        { $unwind: "$c" },
        { $match: { "c.projectId": projectObj } },
        { $group: { _id: null, sum: { $sum: "$amount" } } },
      ]),
    ]);
    const entries: CashExpensesLedgerEntry[] = docs.map((d) => ({
      id: d._id.toString(),
      date: d.date,
      name: "",
      remarks: joinRemarks((d as unknown as { referenceId?: string }).referenceId),
      amount: d.amount,
    }));
    return {
      entityName: contractor?.name ?? "Contractor",
      entityType,
      previousAmount: prevAgg[0]?.sum ?? 0,
      entries,
      currentTotal: entries.reduce((s, e) => s + e.amount, 0),
    };
  }

  if (entityType === "Machinery") {
    if (!mongoose.Types.ObjectId.isValid(entityId)) throw new Error("Invalid entity ID");
    const machineObj = new mongoose.Types.ObjectId(entityId);
    const [machine, docs, prevAgg] = await Promise.all([
      Machine.findById(machineObj).select("name").lean(),
      MachinePayment.find({ machineId: machineObj, date: inRange }).sort({ date: 1, createdAt: 1 }).lean(),
      MachinePayment.aggregate<{ sum: number }>([
        { $match: { machineId: machineObj, date: { $lt: startDate } } },
        { $lookup: { from: machinesColl, localField: "machineId", foreignField: "_id", as: "m" } },
        { $unwind: "$m" },
        { $match: { "m.projectId": projectObj } },
        { $group: { _id: null, sum: { $sum: "$amount" } } },
      ]),
    ]);
    const entries: CashExpensesLedgerEntry[] = docs.map((d) => ({
      id: d._id.toString(),
      date: d.date,
      name: "",
      remarks: joinRemarks(d.referenceId),
      amount: d.amount,
    }));
    return {
      entityName: machine?.name ?? "Machinery",
      entityType,
      previousAmount: prevAgg[0]?.sum ?? 0,
      entries,
      currentTotal: entries.reduce((s, e) => s + e.amount, 0),
    };
  }

  if (entityType === "NonConsumable") {
    const category = entityId;
    const itemIds = await NonConsumableItem.find({ category }).distinct("_id");
    const [docs, prevAgg] = await Promise.all([
      NonConsumableLedgerEntry.find({
        itemId: { $in: itemIds },
        date: inRange,
        totalCost: { $gt: 0 },
        $or: [
          { expenseProjectId: projectObj },
          { expenseProjectId: { $exists: false }, projectTo: projectObj },
          { expenseProjectId: { $exists: false }, projectFrom: projectObj },
        ],
      }).populate<{ itemId: { name: string } }>("itemId", "name").sort({ date: 1, createdAt: 1 }).lean(),
      NonConsumableLedgerEntry.aggregate<{ sum: number }>([
        {
          $match: {
            itemId: { $in: itemIds },
            date: { $lt: startDate },
            totalCost: { $gt: 0 },
            $or: [
              { expenseProjectId: projectObj },
              { expenseProjectId: { $exists: false }, projectTo: projectObj },
              { expenseProjectId: { $exists: false }, projectFrom: projectObj },
            ],
          },
        },
        { $group: { _id: null, sum: { $sum: "$totalCost" } } },
      ]),
    ]);
    const eventLabel: Record<string, string> = {
      Purchase: "Purchase (Add to Company Store)",
      Repair: "Repair / Maintenance",
    };
    const entries: CashExpensesLedgerEntry[] = docs.map((d) => {
      const itemName = populatedIdName(d.itemId).name ?? "Non-Consumable item";
      const purpose = eventLabel[d.eventType] ?? d.eventType;
      return {
        id: d._id.toString(),
        date: d.date,
        name: itemName,
        remarks: joinRemarks(`${itemName} — ${purpose}`, d.remarks),
        amount: d.totalCost ?? 0,
      };
    });
    return {
      entityName: category,
      entityType,
      previousAmount: prevAgg[0]?.sum ?? 0,
      entries,
      currentTotal: entries.reduce((s, e) => s + e.amount, 0),
    };
  }

  if (entityType === "Expense") {
    const category = entityId;
    const [docs, prevAgg] = await Promise.all([
      Expense.find({ projectId: projectObj, category, date: inRange }).sort({ date: 1, createdAt: 1 }).lean(),
      Expense.aggregate<{ sum: number }>([
        { $match: { projectId: projectObj, category, date: { $lt: startDate } } },
        { $group: { _id: null, sum: { $sum: "$amount" } } },
      ]),
    ]);
    const entries: CashExpensesLedgerEntry[] = docs.map((d) => ({
      id: d._id.toString(),
      date: d.date,
      name: "",
      remarks: d.description,
      amount: d.amount,
    }));
    return {
      entityName: category,
      entityType,
      previousAmount: prevAgg[0]?.sum ?? 0,
      entries,
      currentTotal: entries.reduce((s, e) => s + e.amount, 0),
    };
  }

  if (entityType === "Salary") {
    const allProjectEmployeeIds = await Employee.find({ projectId: projectObj }).distinct("_id");
    const [docs, prevAgg] = await Promise.all([
      EmployeePayment.find({ employeeId: { $in: allProjectEmployeeIds }, date: inRange })
        .populate<{ employeeId: { name: string } }>("employeeId", "name")
        .sort({ date: 1, createdAt: 1 })
        .lean(),
      EmployeePayment.aggregate<{ sum: number }>([
        { $match: { employeeId: { $in: allProjectEmployeeIds }, date: { $lt: startDate } } },
        { $group: { _id: null, sum: { $sum: "$amount" } } },
      ]),
    ]);
    const entries: CashExpensesLedgerEntry[] = docs.map((d) => {
      const emp = populatedIdName(d.employeeId);
      return {
        id: d._id.toString(),
        date: d.date,
        name: emp.name ?? "Employee",
        remarks: (d as unknown as { remarks?: string }).remarks ?? "",
        amount: d.amount,
      };
    });
    return {
      entityName: "Employees",
      entityType,
      previousAmount: prevAgg[0]?.sum ?? 0,
      entries,
      currentTotal: entries.reduce((s, e) => s + e.amount, 0),
    };
  }

  throw new Error(`Unsupported entity type: ${entityType}`);
}
