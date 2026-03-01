import mongoose from "mongoose";
import { Vendor } from "../models/Vendor.js";
import { Contractor } from "../models/Contractor.js";
import { getContractorTotals } from "./contractorService.js";
import { Employee } from "../models/Employee.js";
import { Machine } from "../models/Machine.js";
import { NonConsumableLedgerEntry } from "../models/NonConsumableLedgerEntry.js";
import { Expense } from "../models/Expense.js";
import { User } from "../models/User.js";
import { getEmployeeTotals } from "./employeeLedgerService.js";
import { getMachineTotals } from "./machineService.js";

export interface ProjectSummaryBreakdown {
  vendor: { spent: number; liabilities: number };
  contractor: { spent: number; liabilities: number };
  employee: { spent: number; liabilities: number };
  machinery: { spent: number; liabilities: number };
  nonConsumable: { spent: number; liabilities: number };
  expense: { spent: number; liabilities: number };
}

export interface ProjectSummary {
  spent: number;
  liabilities: number;
  breakdown: ProjectSummaryBreakdown;
}

export interface ProjectSummaryOptions {
  /** When set (e.g. Site Manager), projectId must match actor's assigned project */
  actor?: { userId: string; role: string };
}

/**
 * Compute project-scoped Spent and Liabilities from all ledgers.
 * Uses FIFO allocation for Vendor; entry-based aggregation for Contractor, Employee, Machinery.
 * Non-Consumable: Repair totalCost (projectFrom = projectId) counts as Spent; no payment tracking.
 */
export async function computeProjectSpentAndLiabilities(
  projectId: string,
  options?: ProjectSummaryOptions
): Promise<ProjectSummary> {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return zeroSummary();
  }

  const projectObjId = new mongoose.Types.ObjectId(projectId);

  if (options?.actor?.role === "site_manager") {
    const user = await User.findById(options.actor.userId).select("assignedProjectId").lean();
    const assignedId = user?.assignedProjectId?.toString();
    if (!assignedId || assignedId !== projectId) {
      return zeroSummary();
    }
  }

  const [vendorResult, contractorResult, employeeResult, machineryResult, nonConsumableSpent, expenseSpent] =
    await Promise.all([
      computeVendorSpentAndLiabilities(projectObjId),
      computeContractorSpentAndLiabilities(projectObjId),
      computeEmployeeSpentAndLiabilities(projectObjId),
      computeMachinerySpentAndLiabilities(projectObjId),
      computeNonConsumableSpent(projectObjId),
      computeExpenseSpent(projectObjId),
    ]);

  const breakdown: ProjectSummaryBreakdown = {
    vendor: vendorResult,
    contractor: contractorResult,
    employee: employeeResult,
    machinery: machineryResult,
    nonConsumable: { spent: nonConsumableSpent, liabilities: 0 },
    expense: { spent: expenseSpent, liabilities: 0 },
  };

  const spent =
    vendorResult.spent +
    contractorResult.spent +
    employeeResult.spent +
    machineryResult.spent +
    nonConsumableSpent +
    expenseSpent;
  const liabilities =
    vendorResult.liabilities +
    contractorResult.liabilities +
    employeeResult.liabilities +
    machineryResult.liabilities;

  return { spent, liabilities, breakdown };
}

function zeroSummary(): ProjectSummary {
  const z = { spent: 0, liabilities: 0 };
  return {
    spent: 0,
    liabilities: 0,
    breakdown: {
      vendor: { ...z },
      contractor: { ...z },
      employee: { ...z },
      machinery: { ...z },
      nonConsumable: { spent: 0, liabilities: 0 },
      expense: { spent: 0, liabilities: 0 },
    },
  };
}

/** Vendor: same as Liabilities page — sum Vendor.totalPaid (spent) and Vendor.remaining (liabilities) for vendors in project. */
async function computeVendorSpentAndLiabilities(projectObjId: mongoose.Types.ObjectId): Promise<{
  spent: number;
  liabilities: number;
}> {
  const result = await Vendor.aggregate<{ totalPaid: number; remaining: number }>([
    { $match: { projectId: projectObjId } },
    { $group: { _id: null, totalPaid: { $sum: "$totalPaid" }, remaining: { $sum: "$remaining" } } },
  ]);
  return {
    spent: result[0]?.totalPaid ?? 0,
    liabilities: result[0]?.remaining ?? 0,
  };
}

/** Contractor: same as Liabilities page — use getContractorTotals per contractor (sum of all entries, all payments), sum totalPaid and remaining. */
async function computeContractorSpentAndLiabilities(projectObjId: mongoose.Types.ObjectId): Promise<{
  spent: number;
  liabilities: number;
}> {
  const contractors = await Contractor.find({ projectId: projectObjId }).select("_id").lean();
  if (contractors.length === 0) return { spent: 0, liabilities: 0 };

  const totalsList = await Promise.all(contractors.map((c) => getContractorTotals(c._id.toString())));
  const spent = totalsList.reduce((s, t) => s + t.totalPaid, 0);
  const liabilities = totalsList.reduce((s, t) => s + t.remaining, 0);
  return { spent, liabilities };
}

/** Employee: same as employee page — use getEmployeeTotals (sum of EmployeePayment across all months) per employee, then sum. */
async function computeEmployeeSpentAndLiabilities(projectObjId: mongoose.Types.ObjectId): Promise<{
  spent: number;
  liabilities: number;
}> {
  const employees = await Employee.find({ projectId: projectObjId }).select("_id").lean();
  if (employees.length === 0) return { spent: 0, liabilities: 0 };

  const totalsList = await Promise.all(employees.map((emp) => getEmployeeTotals(emp._id.toString())));
  const spent = totalsList.reduce((s, t) => s + t.totalPaid, 0);
  const liabilities = totalsList.reduce((s, t) => s + t.totalDue, 0);
  return { spent, liabilities };
}

/** Machinery: sum totalPaid and remaining for machines in project. */
async function computeMachinerySpentAndLiabilities(projectObjId: mongoose.Types.ObjectId): Promise<{
  spent: number;
  liabilities: number;
}> {
  const machines = await Machine.find({ projectId: projectObjId }).select("_id").lean();
  let spent = 0;
  let liabilities = 0;
  for (const m of machines) {
    const totals = await getMachineTotals(m._id.toString());
    spent += totals.totalPaid;
    liabilities += totals.remaining;
  }
  return { spent, liabilities };
}

/** Non-Consumable Spent: Repair totalCost only (projectFrom = projectId). Purchase is company-level, excluded. */
async function computeNonConsumableSpent(projectObjId: mongoose.Types.ObjectId): Promise<number> {
  const result = await NonConsumableLedgerEntry.aggregate<{ total: number }>([
    { $match: { eventType: "Repair", projectFrom: projectObjId, totalCost: { $exists: true, $gte: 0 } } },
    { $group: { _id: null, total: { $sum: "$totalCost" } } },
  ]);
  return result[0]?.total ?? 0;
}

/** Expense: sum of all Expense amounts for the project (direct spend, no liabilities). */
async function computeExpenseSpent(projectObjId: mongoose.Types.ObjectId): Promise<number> {
  const result = await Expense.aggregate<{ total: number }>([
    { $match: { projectId: projectObjId } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return result[0]?.total ?? 0;
}
