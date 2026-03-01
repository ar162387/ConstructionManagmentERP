import mongoose from "mongoose";
import { BankAccount } from "../models/BankAccount.js";
import { BankTransaction } from "../models/BankTransaction.js";
import { User } from "../models/User.js";
import { logAudit } from "./auditService.js";
import { roleDisplay } from "./authService.js";

export interface BankAccountPayload {
  id: string;
  name: string;
  accountNumber: string;
  openingBalance: number;
  currentBalance: number;
  totalInflow: number;
  totalOutflow: number;
}

export interface CreateBankAccountInput {
  name: string;
  accountNumber?: string;
  openingBalance?: number;
}

export interface UpdateBankAccountInput {
  name?: string;
  accountNumber?: string;
  openingBalance?: number;
}

function toPayload(doc: {
  _id: mongoose.Types.ObjectId;
  name: string;
  accountNumber?: string;
  openingBalance?: number;
  currentBalance?: number;
  totalInflow?: number;
  totalOutflow?: number;
}): BankAccountPayload {
  return {
    id: doc._id.toString(),
    name: doc.name,
    accountNumber: doc.accountNumber ?? "",
    openingBalance: doc.openingBalance ?? 0,
    currentBalance: doc.currentBalance ?? 0,
    totalInflow: doc.totalInflow ?? 0,
    totalOutflow: doc.totalOutflow ?? 0,
  };
}

export async function listBankAccounts(): Promise<BankAccountPayload[]> {
  const docs = await BankAccount.find().sort({ createdAt: -1 }).lean();
  return docs.map(toPayload);
}

export async function createBankAccount(
  actor: { userId: string; email: string; role: string },
  input: CreateBankAccountInput
): Promise<BankAccountPayload> {
  if (!input.name?.trim()) {
    throw new Error("Account name is required");
  }
  const openingBalance = Number(input.openingBalance ?? 0);
  if (isNaN(openingBalance) || openingBalance < 0) {
    throw new Error("Valid opening balance is required");
  }

  const doc = await BankAccount.create({
    name: input.name.trim(),
    accountNumber: (input.accountNumber ?? "").trim(),
    openingBalance,
    currentBalance: openingBalance,
    totalInflow: 0,
    totalOutflow: 0,
  });

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "create",
    module: "bank_accounts",
    entityId: doc._id.toString(),
    description: `Created bank account: ${doc.name}`,
    newValue: { name: doc.name, accountNumber: doc.accountNumber, openingBalance: doc.openingBalance },
  });

  return toPayload(doc);
}

export async function updateBankAccount(
  actor: { userId: string; email: string; role: string },
  id: string,
  input: UpdateBankAccountInput
): Promise<BankAccountPayload> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid account ID");
  }

  const target = await BankAccount.findById(id);
  if (!target) {
    throw new Error("Account not found");
  }

  const updates: Record<string, unknown> = {};

  if (input.name != null) {
    const name = input.name.trim();
    if (!name) throw new Error("Account name is required");
    updates.name = name;
  }
  if (input.accountNumber !== undefined) updates.accountNumber = (input.accountNumber ?? "").trim();
  if (input.openingBalance != null) {
    const ob = Number(input.openingBalance);
    if (isNaN(ob) || ob < 0) throw new Error("Valid opening balance is required");
    // Recompute currentBalance: opening + inflow - outflow
    const newCurrentBalance = ob + (target.totalInflow ?? 0) - (target.totalOutflow ?? 0);
    if (newCurrentBalance < 0) {
      throw new Error(
        `Cannot set opening balance to ${ob.toLocaleString()}: resulting balance would be negative (${newCurrentBalance.toLocaleString()}). ` +
        `Current inflow: ${(target.totalInflow ?? 0).toLocaleString()}, outflow: ${(target.totalOutflow ?? 0).toLocaleString()}.`
      );
    }
    updates.openingBalance = ob;
    updates.currentBalance = newCurrentBalance;
  }

  const updated = await BankAccount.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) {
    throw new Error("Update failed");
  }

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "update",
    module: "bank_accounts",
    entityId: id,
    description: `Updated bank account: ${target.name}`,
    oldValue: { name: target.name, accountNumber: target.accountNumber, openingBalance: target.openingBalance },
    newValue: { name: updated.name, accountNumber: updated.accountNumber, openingBalance: updated.openingBalance },
  });

  return toPayload(updated);
}

export async function deleteBankAccount(
  actor: { userId: string; email: string; role: string },
  id: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid account ID");
  }

  const target = await BankAccount.findById(id);
  if (!target) {
    throw new Error("Account not found");
  }

  const txCount = await BankTransaction.countDocuments({ accountId: new mongoose.Types.ObjectId(id) });
  if (txCount > 0) {
    throw new Error(`Cannot delete: ${txCount} transaction(s) linked to this account. Remove transactions first.`);
  }

  await BankAccount.findByIdAndDelete(id);

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "delete",
    module: "bank_accounts",
    entityId: id,
    description: `Deleted bank account: ${target.name}`,
    oldValue: { name: target.name, accountNumber: target.accountNumber },
  });
}
