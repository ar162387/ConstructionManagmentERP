import mongoose from "mongoose";
import { ItemLedgerEntry } from "../models/ItemLedgerEntry.js";
import { ConsumableItem } from "../models/ConsumableItem.js";
import { Vendor } from "../models/Vendor.js";
import { User } from "../models/User.js";
import { logAudit } from "./auditService.js";
import { roleDisplay } from "./authService.js";
import { getVendorLedger } from "./vendorPaymentService.js";
import { getFifoAllocationForVendor } from "./fifoAllocation.js";

export interface ItemLedgerPayload {
  id: string;
  projectId: string;
  itemId: string;
  vendorId: string;
  vendorName: string;
  date: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paidAmount: number;
  remaining: number;
  biltyNumber?: string;
  vehicleNumber?: string;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

export interface CreateItemLedgerInput {
  projectId: string;
  itemId: string;
  vendorId: string;
  date: string;
  quantity: number;
  unitPrice: number;
  paidAmount?: number;
  biltyNumber?: string;
  vehicleNumber?: string;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

export interface UpdateItemLedgerInput {
  vendorId?: string;
  date?: string;
  quantity?: number;
  unitPrice?: number;
  paidAmount?: number;
  biltyNumber?: string;
  vehicleNumber?: string;
  paymentMethod?: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

async function buildPayload(doc: {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  date: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paidAmount: number;
  remaining: number;
  biltyNumber?: string;
  vehicleNumber?: string;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}): Promise<ItemLedgerPayload> {
  const vendor = await Vendor.findById(doc.vendorId).select("name").lean();
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    itemId: doc.itemId.toString(),
    vendorId: doc.vendorId.toString(),
    vendorName: vendor?.name ?? "Unknown",
    date: doc.date,
    quantity: doc.quantity,
    unitPrice: doc.unitPrice,
    totalPrice: doc.totalPrice,
    paidAmount: doc.paidAmount,
    remaining: doc.remaining,
    biltyNumber: doc.biltyNumber,
    vehicleNumber: doc.vehicleNumber,
    paymentMethod: doc.paymentMethod,
    referenceId: doc.referenceId,
    remarks: doc.remarks,
  };
}

const DEFAULT_PAGE_SIZE = 12;

export interface ListItemLedgerOptions {
  page?: number;
  pageSize?: number;
}

export interface ListItemLedgerResult {
  entries: ItemLedgerPayload[];
  total: number;
}

export async function listItemLedger(
  itemId: string,
  options?: ListItemLedgerOptions
): Promise<ListItemLedgerResult> {
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    return { entries: [], total: 0 };
  }
  const docs = await ItemLedgerEntry.find({ itemId }).sort({ date: -1 }).lean();
  const vendorIds = [...new Set(docs.map((d) => d.vendorId.toString()))];
  const allocationByVendor = new Map<string, Awaited<ReturnType<typeof getFifoAllocationForVendor>>>();
  await Promise.all(
    vendorIds.map(async (vid) => {
      allocationByVendor.set(vid, await getFifoAllocationForVendor(vid));
    })
  );
  const payloads = await Promise.all(docs.map(buildPayload));
  for (let i = 0; i < payloads.length; i++) {
    const alloc = allocationByVendor.get(docs[i].vendorId.toString())?.get(payloads[i].id);
    if (alloc) {
      payloads[i].paidAmount = alloc.allocatedPaid;
      payloads[i].remaining = alloc.allocatedRemaining;
    }
  }
  const total = payloads.length;
  const pageSize = Math.min(Math.max(1, options?.pageSize ?? DEFAULT_PAGE_SIZE), 100);
  const page = Math.max(1, options?.page ?? 1);
  const start = (page - 1) * pageSize;
  const entries = payloads.slice(start, start + pageSize);
  return { entries, total };
}

/** Add item ledger entry: creates entry, updates item totals and vendor denormalized totals in a transaction. */
export async function createItemLedgerEntry(
  actor: { userId: string; email: string; role: string },
  input: CreateItemLedgerInput
): Promise<ItemLedgerPayload> {
  if (!input.date) throw new Error("Date is required");
  if (!input.quantity || input.quantity < 1) throw new Error("Quantity must be at least 1");
  if (input.unitPrice == null || input.unitPrice < 0) throw new Error("Unit price must be >= 0");
  if (!input.vendorId) throw new Error("Vendor is required");
  if (!["Cash", "Bank", "Online"].includes(input.paymentMethod)) throw new Error("Invalid payment method");

  const totalPrice = input.quantity * input.unitPrice;
  const paidAmount = Math.min(input.paidAmount ?? 0, totalPrice);
  if ((input.paidAmount ?? 0) > totalPrice) throw new Error("Paid amount cannot exceed total price");
  const remaining = totalPrice - paidAmount;

  const item = await ConsumableItem.findById(input.itemId).lean();
  if (!item) throw new Error("Item not found");

  const vendor = await Vendor.findOne({ _id: input.vendorId, projectId: item.projectId }).lean();
  if (!vendor) throw new Error("Vendor not found or does not belong to this project");

  const session = await mongoose.startSession();
  let result: ItemLedgerPayload;
  try {
    await session.withTransaction(async () => {
      const [entry] = await ItemLedgerEntry.create(
        [
          {
            projectId: item.projectId,
            itemId: input.itemId,
            vendorId: input.vendorId,
            date: input.date,
            quantity: input.quantity,
            unitPrice: input.unitPrice,
            totalPrice,
            paidAmount,
            remaining,
            biltyNumber: input.biltyNumber?.trim() || undefined,
            vehicleNumber: input.vehicleNumber?.trim() || undefined,
            paymentMethod: input.paymentMethod,
            referenceId: input.referenceId?.trim() || undefined,
            remarks: input.remarks?.trim() || undefined,
          },
        ],
        { session }
      );

      await ConsumableItem.findByIdAndUpdate(
        input.itemId,
        {
          $inc: {
            currentStock: input.quantity,
            totalPurchased: input.quantity,
            totalAmount: totalPrice,
            totalPaid: paidAmount,
            totalPending: remaining,
          },
        },
        { session }
      );

      await Vendor.findByIdAndUpdate(
        input.vendorId,
        {
          $inc: {
            totalBilled: totalPrice,
            totalPaid: paidAmount,
            remaining,
          },
        },
        { session }
      );

      result = await buildPayload(entry);
    });
  } finally {
    session.endSession();
  }

  const fifoMap = await getFifoAllocationForVendor(result!.vendorId);
  const alloc = fifoMap.get(result!.id);
  if (alloc) {
    result!.paidAmount = alloc.allocatedPaid;
    result!.remaining = alloc.allocatedRemaining;
  }

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "create",
    module: "item_ledger",
    entityId: result!.id,
    description: `Added ledger entry: ${item.name} — qty ${input.quantity} @ ${input.unitPrice}`,
    newValue: { quantity: input.quantity, totalPrice, paidAmount, remaining },
  });

  return result!;
}

/** Edit ledger entry: reverse old deltas, apply new deltas — transactional. */
export async function updateItemLedgerEntry(
  actor: { userId: string; email: string; role: string },
  id: string,
  input: UpdateItemLedgerInput
): Promise<ItemLedgerPayload> {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid ledger entry ID");

  const existing = await ItemLedgerEntry.findById(id).lean();
  if (!existing) throw new Error("Ledger entry not found");

  const newQuantity = input.quantity ?? existing.quantity;
  const newUnitPrice = input.unitPrice ?? existing.unitPrice;
  const newTotalPrice = newQuantity * newUnitPrice;
  const rawPaid = input.paidAmount ?? existing.paidAmount;
  if (rawPaid > newTotalPrice) throw new Error("Paid amount cannot exceed total price");
  const newPaidAmount = rawPaid;
  const newRemaining = newTotalPrice - newPaidAmount;

  const newVendorId = input.vendorId ?? existing.vendorId.toString();
  if (!mongoose.Types.ObjectId.isValid(newVendorId)) throw new Error("Invalid vendor ID");

  // Prevent over-credit: increasing paid on this entry must not push vendor remaining below zero.
  // totalPaid = sum(ledger.paidAmount) + sum(VendorPayment); remaining = totalBilled - totalPaid.
  if (newPaidAmount > existing.paidAmount) {
    const { remaining: vendorRemaining } = await getVendorLedger(existing.vendorId.toString());
    const maxAllowedPaid = existing.paidAmount + vendorRemaining;
    if (newPaidAmount > maxAllowedPaid) {
      throw new Error(
        `Paid amount cannot exceed total price and must not overpay the vendor. Maximum allowed for this entry is ${maxAllowedPaid.toLocaleString()} (current paid ${existing.paidAmount.toLocaleString()} + vendor remaining ${vendorRemaining.toLocaleString()})`
      );
    }
  }

  const session = await mongoose.startSession();
  let result: ItemLedgerPayload;
  try {
    await session.withTransaction(async () => {
      // Reverse old deltas on item
      await ConsumableItem.findByIdAndUpdate(
        existing.itemId,
        {
          $inc: {
            currentStock: -existing.quantity,
            totalPurchased: -existing.quantity,
            totalAmount: -existing.totalPrice,
            totalPaid: -existing.paidAmount,
            totalPending: -existing.remaining,
          },
        },
        { session }
      );

      // Reverse old deltas on original vendor
      await Vendor.findByIdAndUpdate(
        existing.vendorId,
        {
          $inc: {
            totalBilled: -existing.totalPrice,
            totalPaid: -existing.paidAmount,
            remaining: -existing.remaining,
          },
        },
        { session }
      );

      // Apply new deltas on item
      await ConsumableItem.findByIdAndUpdate(
        existing.itemId,
        {
          $inc: {
            currentStock: newQuantity,
            totalPurchased: newQuantity,
            totalAmount: newTotalPrice,
            totalPaid: newPaidAmount,
            totalPending: newRemaining,
          },
        },
        { session }
      );

      // Apply new deltas on (potentially new) vendor
      await Vendor.findByIdAndUpdate(
        newVendorId,
        {
          $inc: {
            totalBilled: newTotalPrice,
            totalPaid: newPaidAmount,
            remaining: newRemaining,
          },
        },
        { session }
      );

      const updates: Record<string, unknown> = {
        quantity: newQuantity,
        unitPrice: newUnitPrice,
        totalPrice: newTotalPrice,
        paidAmount: newPaidAmount,
        remaining: newRemaining,
        vendorId: newVendorId,
      };
      if (input.date) updates.date = input.date;
      if (input.biltyNumber !== undefined) updates.biltyNumber = input.biltyNumber?.trim() || undefined;
      if (input.vehicleNumber !== undefined) updates.vehicleNumber = input.vehicleNumber?.trim() || undefined;
      if (input.paymentMethod) updates.paymentMethod = input.paymentMethod;
      if (input.referenceId !== undefined) updates.referenceId = input.referenceId?.trim() || undefined;
      if (input.remarks !== undefined) updates.remarks = input.remarks?.trim() || undefined;

      const updated = await ItemLedgerEntry.findByIdAndUpdate(id, updates, { new: true, session }).lean();
      if (!updated) throw new Error("Update failed");
      result = await buildPayload(updated);
    });
  } finally {
    session.endSession();
  }

  const fifoMap = await getFifoAllocationForVendor(result!.vendorId);
  const alloc = fifoMap.get(result!.id);
  if (alloc) {
    result!.paidAmount = alloc.allocatedPaid;
    result!.remaining = alloc.allocatedRemaining;
  }

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "update",
    module: "item_ledger",
    entityId: id,
    description: `Updated ledger entry`,
    oldValue: { quantity: existing.quantity, totalPrice: existing.totalPrice, paidAmount: existing.paidAmount },
    newValue: { quantity: newQuantity, totalPrice: newTotalPrice, paidAmount: newPaidAmount },
  });

  return result!;
}

/** Delete ledger entry: reverse all deltas on item and vendor — transactional. */
export async function deleteItemLedgerEntry(
  actor: { userId: string; email: string; role: string },
  id: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid ledger entry ID");

  const existing = await ItemLedgerEntry.findById(id).lean();
  if (!existing) throw new Error("Ledger entry not found");

  const item = await ConsumableItem.findById(existing.itemId).select("currentStock name unit").lean();
  if (!item) throw new Error("Item not found");
  if (item.currentStock - existing.quantity < 0) {
    throw new Error(
      `Cannot delete this ledger entry: it would make stock negative. Current stock for "${item.name}" is ${item.currentStock} ${item.unit}; this entry adds ${existing.quantity}. Delete or reduce stock consumption first.`
    );
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await ConsumableItem.findByIdAndUpdate(
        existing.itemId,
        {
          $inc: {
            currentStock: -existing.quantity,
            totalPurchased: -existing.quantity,
            totalAmount: -existing.totalPrice,
            totalPaid: -existing.paidAmount,
            totalPending: -existing.remaining,
          },
        },
        { session }
      );

      await Vendor.findByIdAndUpdate(
        existing.vendorId,
        {
          $inc: {
            totalBilled: -existing.totalPrice,
            totalPaid: -existing.paidAmount,
            remaining: -existing.remaining,
          },
        },
        { session }
      );

      await ItemLedgerEntry.findByIdAndDelete(id, { session });
    });
  } finally {
    session.endSession();
  }

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "delete",
    module: "item_ledger",
    entityId: id,
    description: `Deleted ledger entry`,
    oldValue: { quantity: existing.quantity, totalPrice: existing.totalPrice },
  });
}
