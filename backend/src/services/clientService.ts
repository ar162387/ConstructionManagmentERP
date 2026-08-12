import mongoose from "mongoose";
import { Client } from "../models/Client.js";
import { BankTransaction } from "../models/BankTransaction.js";
import { logAudit } from "./auditService.js";
import { User } from "../models/User.js";
import { roleDisplay } from "./authService.js";

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
export interface ClientPayload { id: string; name: string }
export interface ClientLedgerRow { id: string; date: string; description: string; payment: number; source: string; accountId: string; projectId?: string; projectName?: string; accountName: string; mode: "Cash" | "Bank" | "Online"; referenceId?: string; remarks?: string; balance: number }

export async function listClients(): Promise<ClientPayload[]> {
  return (await Client.find().sort({ name: 1 }).lean()).map((client) => ({ id: client._id.toString(), name: client.name }));
}

export async function createClient(actor: { userId: string; email: string; role: string }, name: string): Promise<ClientPayload> {
  const cleaned = name?.trim();
  if (!cleaned) throw new Error("Client name is required");
  const normalizedName = normalize(cleaned);
  let client = await Client.findOne({ normalizedName });
  if (!client) {
    client = await Client.create({ name: cleaned, normalizedName });
    const user = await User.findById(actor.userId).lean();
    await logAudit({ userId: actor.userId, userName: user?.name ?? "Unknown", userEmail: actor.email, role: roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role, action: "create", module: "clients", entityId: client._id.toString(), description: `Created client: ${client.name}`, newValue: { name: client.name } });
  }
  return { id: client._id.toString(), name: client.name };
}

export async function updateClient(actor: { userId: string; email: string; role: string }, id: string, name: string): Promise<ClientPayload> {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid client ID");
  const cleaned = name?.trim();
  if (!cleaned) throw new Error("Client name is required");
  const normalizedName = normalize(cleaned);
  const duplicate = await Client.findOne({ normalizedName, _id: { $ne: new mongoose.Types.ObjectId(id) } }).lean();
  if (duplicate) throw new Error("A client with this name already exists");
  const client = await Client.findByIdAndUpdate(id, { name: cleaned, normalizedName }, { new: true });
  if (!client) throw new Error("Client not found");
  await BankTransaction.updateMany({ clientId: client._id }, { $set: { source: cleaned } });
  const user = await User.findById(actor.userId).lean();
  await logAudit({ userId: actor.userId, userName: user?.name ?? "Unknown", userEmail: actor.email, role: roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role, action: "update", module: "clients", entityId: client._id.toString(), description: `Updated client: ${client.name}`, newValue: { name: client.name } });
  return { id: client._id.toString(), name: client.name };
}

export async function getClientLedger(clientId: string, projectId?: string): Promise<{ clientName: string; rows: ClientLedgerRow[] }> {
  if (!mongoose.Types.ObjectId.isValid(clientId)) throw new Error("Invalid client ID");
  const client = await Client.findById(clientId).lean();
  if (!client) throw new Error("Client not found");
  const filter: Record<string, unknown> = { clientId: new mongoose.Types.ObjectId(clientId), type: "inflow" };
  if (projectId) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) throw new Error("Invalid project ID");
    filter.projectId = new mongoose.Types.ObjectId(projectId);
  }
  const docs = await BankTransaction.find(filter).sort({ date: 1, createdAt: 1, _id: 1 }).populate("accountId", "name").populate("projectId", "name").lean();
  let balance = 0;
  const rows = docs.map((doc) => {
    balance += doc.amount;
    const account = doc.accountId as unknown as { name?: string } | null;
    const project = doc.projectId as unknown as { _id?: mongoose.Types.ObjectId; name?: string } | null;
    return { id: doc._id.toString(), date: doc.date, description: [doc.referenceId, doc.remarks].filter(Boolean).join(" — ") || "—", payment: doc.amount, source: doc.source, accountId: (doc.accountId as unknown as { _id?: mongoose.Types.ObjectId })?._id?.toString() ?? String(doc.accountId), projectId: project?._id?.toString(), projectName: project?.name, accountName: account?.name ?? "—", mode: doc.mode, referenceId: doc.referenceId, remarks: doc.remarks, balance };
  });
  return { clientName: client.name, rows };
}
