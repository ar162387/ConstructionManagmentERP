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
  amount: number;
  remarks: string;
  sourceId?: string;
}

export interface CashExpensesReportBankAccount {
  id: string;
  name: string;
  openingBalance: number;
  closingBalance: number;
}

export interface CashExpensesReportOpeningBalances {
  projectLedger: number;
  projectLedgerClosing: number;
  bankAccounts: CashExpensesReportBankAccount[];
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

export async function getCashExpensesReport(
  actor: { userId: string; role: string },
  projectId: string,
  date: string
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

  const [bankAccounts, bankTxByAccount, projectInflowsToday, consumablePayments, vendorPayments, contractorPayments, employeePayments, expenses, machinePayments, nonConsumablePayments] = await Promise.all([
    BankAccount.find({}).select("_id name currentBalance").lean(),
    BankTransaction.find({ date }).lean().then((txs) => {
      const byAccount: Record<string, { inflow: number; outflow: number }> = {};
      for (const t of txs) {
        const id = t.accountId.toString();
        if (!byAccount[id]) byAccount[id] = { inflow: 0, outflow: 0 };
        if (t.type === "inflow") byAccount[id].inflow += t.amount;
        else byAccount[id].outflow += t.amount;
      }
      return byAccount;
    }),
    BankTransaction.find({ projectId: projectObj, type: "inflow", date })
      .lean()
      .then((txs) => txs.reduce((s, t) => s + t.amount, 0)),
    ItemLedgerEntry.find({ projectId: projectObj, date, paidAmount: { $gt: 0 } })
      .populate<{ itemId: { name: string } }>("itemId", "name")
      .lean(),
    VendorPayment.find({ date })
      .populate<{ vendorId: { projectId: mongoose.Types.ObjectId; name: string } }>("vendorId", "projectId name")
      .lean()
      .then((rows) => rows.filter((r) => r.vendorId?.projectId?.toString() === projectId)),
    ContractorPayment.find({ date })
      .populate<{ contractorId: { projectId: mongoose.Types.ObjectId; name: string } }>("contractorId", "projectId name")
      .lean()
      .then((rows) => rows.filter((r) => r.contractorId?.projectId?.toString() === projectId)),
    EmployeePayment.find({ date })
      .populate<{ employeeId: { projectId: mongoose.Types.ObjectId; name: string } }>("employeeId", "projectId name")
      .lean()
      .then((rows) => rows.filter((r) => r.employeeId?.projectId?.toString() === projectId)),
    Expense.find({ projectId: projectObj, date }).lean(),
    MachinePayment.find({ date })
      .populate<{ machineId: { projectId: mongoose.Types.ObjectId; name: string } }>("machineId", "projectId name")
      .lean()
      .then((rows) => rows.filter((r) => r.machineId?.projectId?.toString() === projectId)),
    NonConsumableLedgerEntry.find({
      date,
      eventType: "Purchase",
      totalCost: { $gt: 0 },
      $or: [{ projectTo: projectObj }, { projectFrom: projectObj }],
    })
      .populate<{ itemId: { name: string } }>("itemId", "name")
      .lean(),
  ]);

  const payments: CashExpensesReportPayment[] = [];

  for (const row of consumablePayments) {
    const item = row.itemId as { name?: string } | null;
    payments.push({
      entityName: item?.name ?? "Consumable",
      entityType: "Consumable",
      amount: row.paidAmount,
      remarks: joinRemarks(row.referenceId, row.remarks),
      sourceId: row._id.toString(),
    });
  }

  for (const row of vendorPayments) {
    const vendor = row.vendorId as { name?: string } | null;
    payments.push({
      entityName: vendor?.name ?? "Vendor",
      entityType: "Vendor",
      amount: row.amount,
      remarks: joinRemarks(row.referenceId, row.remarks),
      sourceId: row._id.toString(),
    });
  }

  for (const row of contractorPayments) {
    const contractor = row.contractorId as { name?: string } | null;
    payments.push({
      entityName: contractor?.name ?? "Contractor",
      entityType: "Contractor",
      amount: row.amount,
      remarks: joinRemarks((row as { referenceId?: string }).referenceId),
      sourceId: row._id.toString(),
    });
  }

  for (const row of employeePayments) {
    const employee = row.employeeId as { name?: string } | null;
    payments.push({
      entityName: employee?.name ?? "Employee",
      entityType: "Salary",
      amount: row.amount,
      remarks: joinRemarks(row.remarks),
      sourceId: row._id.toString(),
    });
  }

  for (const row of expenses) {
    payments.push({
      entityName: row.category || row.description,
      entityType: "Expense",
      amount: row.amount,
      remarks: row.description || "",
      sourceId: row._id.toString(),
    });
  }

  for (const row of machinePayments) {
    const machine = row.machineId as { name?: string } | null;
    payments.push({
      entityName: machine?.name ?? "Machinery",
      entityType: "Machinery",
      amount: row.amount,
      remarks: joinRemarks(row.referenceId),
      sourceId: row._id.toString(),
    });
  }

  for (const row of nonConsumablePayments) {
    const item = row.itemId as { name?: string } | null;
    const cost = row.totalCost ?? 0;
    if (cost <= 0) continue;
    payments.push({
      entityName: item?.name ?? "Non-Consumable",
      entityType: "NonConsumable",
      amount: cost,
      remarks: joinRemarks(row.remarks),
      sourceId: row._id.toString(),
    });
  }

  payments.sort((a, b) => a.entityName.localeCompare(b.entityName));

  const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
  const projectLedgerClosing = project.balance ?? 0;
  // Project: opening + total inflows to project from all accounts - total payments = closing (project.balance)
  const projectLedgerOpening = projectLedgerClosing - projectInflowsToday + totalPayments;
  // Bank: opening = start-of-day balance (current - inflows + outflows); closing = end-of-day balance (current), with outflows from that account reducing the balance during the day
  const bankAccountsWithClosing = bankAccounts.map((acc) => {
    const id = acc._id.toString();
    const current = acc.currentBalance ?? 0;
    const day = bankTxByAccount[id] ?? { inflow: 0, outflow: 0 };
    const opening = current - day.inflow + day.outflow;
    return {
      id,
      name: acc.name,
      openingBalance: opening,
      closingBalance: current,
    };
  });
  const bankOpeningTotal = bankAccountsWithClosing.reduce((s, a) => s + a.openingBalance, 0);
  const bankClosingTotal = bankAccountsWithClosing.reduce((s, a) => s + a.closingBalance, 0);
  const totalOpening = projectLedgerOpening + bankOpeningTotal;
  const closingBalance = projectLedgerClosing + bankClosingTotal;

  const openingBalances: CashExpensesReportOpeningBalances = {
    projectLedger: projectLedgerOpening,
    projectLedgerClosing,
    bankAccounts: bankAccountsWithClosing,
  };

  return {
    openingBalances,
    payments,
    totalPayments,
    closingBalance,
  };
}
