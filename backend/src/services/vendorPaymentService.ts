import mongoose from "mongoose";
import { VendorPayment } from "../models/VendorPayment.js";
import { ItemLedgerEntry } from "../models/ItemLedgerEntry.js";
import { ConsumableItem } from "../models/ConsumableItem.js";
import { Vendor } from "../models/Vendor.js";
import { User } from "../models/User.js";
import { logAudit } from "./auditService.js";
import { roleDisplay } from "./authService.js";
import { getFifoAllocationForVendor } from "./fifoAllocation.js";

export interface VendorPaymentPayload {
  id: string;
  vendorId: string;
  date: string;
  amount: number;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

export interface CreateVendorPaymentInput {
  date: string;
  amount: number;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

export interface VendorLedgerRow {
  type: "purchase" | "payment";
  id: string;
  date: string;
  /** For purchase rows: item name */
  itemName?: string;
  /** For purchase rows */
  quantity?: number;
  totalPrice?: number;
  paidAmount?: number;
  remaining?: number;
  /** For payment rows */
  amount?: number;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

function toPayload(doc: {
  _id: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  date: string;
  amount: number;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}): VendorPaymentPayload {
  return {
    id: doc._id.toString(),
    vendorId: doc.vendorId.toString(),
    date: doc.date,
    amount: doc.amount,
    paymentMethod: doc.paymentMethod,
    referenceId: doc.referenceId,
    remarks: doc.remarks,
  };
}

const DEFAULT_PAGE_SIZE = 12;

export interface GetVendorLedgerOptions {
  page?: number;
  pageSize?: number;
}

/**
 * Returns the combined "vendor ledger": item purchase rows + payment rows, sorted by date desc.
 * Also returns computed totals. Supports pagination (default pageSize 12).
 */
export async function getVendorLedger(
  vendorId: string,
  options?: GetVendorLedgerOptions
): Promise<{
  rows: VendorLedgerRow[];
  totalBilled: number;
  totalPaid: number;
  remaining: number;
  total: number;
}> {
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    return { rows: [], totalBilled: 0, totalPaid: 0, remaining: 0, total: 0 };
  }

  const [ledgerEntries, payments] = await Promise.all([
    ItemLedgerEntry.find({ vendorId }).sort({ date: -1 }).lean(),
    VendorPayment.find({ vendorId }).sort({ date: -1 }).lean(),
  ]);

  const itemIds = [...new Set(ledgerEntries.map((e) => e.itemId.toString()))];
  const itemDocs = await ConsumableItem.find({ _id: { $in: itemIds } }).select("name").lean();
  const itemMap = new Map(itemDocs.map((i) => [i._id.toString(), i.name]));

  let totalBilled = 0;
  let totalPaidFromLedger = 0;

  const purchaseRows: VendorLedgerRow[] = ledgerEntries.map((e) => {
    totalBilled += e.totalPrice;
    totalPaidFromLedger += e.paidAmount;
    return {
      type: "purchase",
      id: e._id.toString(),
      date: e.date,
      itemName: itemMap.get(e.itemId.toString()) ?? "Unknown",
      quantity: e.quantity,
      totalPrice: e.totalPrice,
      paidAmount: e.paidAmount,
      remaining: e.remaining,
      paymentMethod: e.paymentMethod,
      referenceId: e.referenceId,
      remarks: e.remarks,
    };
  });

  const fifoMap = await getFifoAllocationForVendor(vendorId);
  for (const row of purchaseRows) {
    if (row.type === "purchase" && row.id) {
      const alloc = fifoMap.get(row.id);
      if (alloc) {
        row.paidAmount = alloc.allocatedPaid;
        row.remaining = alloc.allocatedRemaining;
      }
    }
  }

  let totalPaidFromPayments = 0;
  const paymentRows: VendorLedgerRow[] = payments.map((p) => {
    totalPaidFromPayments += p.amount;
    return {
      type: "payment",
      id: p._id.toString(),
      date: p.date,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      referenceId: p.referenceId,
      remarks: p.remarks,
    };
  });

  const totalPaid = totalPaidFromLedger + totalPaidFromPayments;
  const remaining = Math.max(0, totalBilled - totalPaid);

  const allRows = [...purchaseRows, ...paymentRows].sort((a, b) => b.date.localeCompare(a.date));
  const total = allRows.length;
  const pageSize = Math.min(Math.max(1, options?.pageSize ?? DEFAULT_PAGE_SIZE), 100);
  const page = Math.max(1, options?.page ?? 1);
  const start = (page - 1) * pageSize;
  const rows = allRows.slice(start, start + pageSize);

  return { rows, totalBilled, totalPaid, remaining, total };
}

export async function createVendorPayment(
  actor: { userId: string; email: string; role: string },
  vendorId: string,
  input: CreateVendorPaymentInput
): Promise<VendorPaymentPayload> {
  if (!mongoose.Types.ObjectId.isValid(vendorId)) throw new Error("Invalid vendor ID");
  if (!input.date) throw new Error("Date is required");
  if (!input.amount || input.amount <= 0) throw new Error("Amount must be positive");
  if (!["Cash", "Bank", "Online"].includes(input.paymentMethod)) throw new Error("Invalid payment method");

  const vendor = await Vendor.findById(vendorId).lean();
  if (!vendor) throw new Error("Vendor not found");

  const { remaining } = await getVendorLedger(vendorId);
  if (input.amount > remaining) {
    throw new Error(
      `Payment amount ${input.amount.toLocaleString()} exceeds vendor remaining balance of ${remaining.toLocaleString()}`
    );
  }

  const session = await mongoose.startSession();
  let result: VendorPaymentPayload;
  try {
    await session.withTransaction(async () => {
      const [payment] = await VendorPayment.create(
        [
          {
            vendorId,
            date: input.date,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            referenceId: input.referenceId?.trim() || undefined,
            remarks: input.remarks?.trim() || undefined,
          },
        ],
        { session }
      );

      await Vendor.findByIdAndUpdate(
        vendorId,
        {
          $inc: {
            totalPaid: input.amount,
            remaining: -input.amount,
          },
        },
        { session }
      );

      result = toPayload(payment);
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
    action: "create",
    module: "vendor_payments",
    entityId: result!.id,
    description: `Recorded payment: ${vendor.name} — ${input.amount.toLocaleString()} PKR`,
    newValue: { amount: input.amount, vendorId, date: input.date },
  });

  return result!;
}

export async function deleteVendorPayment(
  actor: { userId: string; email: string; role: string },
  id: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid payment ID");

  const existing = await VendorPayment.findById(id).lean();
  if (!existing) throw new Error("Payment not found");

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Vendor.findByIdAndUpdate(
        existing.vendorId,
        {
          $inc: {
            totalPaid: -existing.amount,
            remaining: existing.amount,
          },
        },
        { session }
      );
      await VendorPayment.findByIdAndDelete(id, { session });
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
    module: "vendor_payments",
    entityId: id,
    description: `Deleted payment: ${existing.amount.toLocaleString()} PKR`,
    oldValue: { amount: existing.amount, date: existing.date },
  });
}
