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
  source: "external" | "advance";
  advancePortion: number;
  referenceId?: string;
  remarks?: string;
}

export interface CreateVendorPaymentInput {
  date: string;
  amount: number;
  paymentMethod: "Cash" | "Bank" | "Online";
  /** "external" (default) = fresh payment; any excess over the vendor's remaining becomes
   *  advance. "advance" = settle an outstanding due by drawing down the vendor's existing
   *  advance balance instead of paying fresh money. */
  source?: "external" | "advance";
  /** Pins this payment to one specific ItemLedgerEntry so FIFO settles that bill directly
   *  instead of redirecting the money to whichever bill happens to be oldest. Must belong to
   *  this vendor. Typically used with source "advance" ("apply this advance to this delivery"),
   *  but not restricted to it. */
  targetEntryId?: string;
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
  /** For purchase rows: how much of paidAmount exceeded totalPrice and became vendor advance */
  advanceGenerated?: number;
  /** For payment rows */
  amount?: number;
  /** For payment rows: "external" = fresh payment, "advance" = settled from existing advance balance */
  source?: "external" | "advance";
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
  /** Cumulative cash disbursed to the vendor as of this row's date (previousBalance + net cash paid/advance-applied up to and including this row). */
  runningTotal: number;
}

function toPayload(doc: {
  _id: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  date: string;
  amount: number;
  paymentMethod: "Cash" | "Bank" | "Online";
  source: "external" | "advance";
  advancePortion: number;
  referenceId?: string;
  remarks?: string;
}): VendorPaymentPayload {
  return {
    id: doc._id.toString(),
    vendorId: doc.vendorId.toString(),
    date: doc.date,
    amount: doc.amount,
    paymentMethod: doc.paymentMethod,
    source: doc.source,
    advancePortion: doc.advancePortion,
    referenceId: doc.referenceId,
    remarks: doc.remarks,
  };
}

const DEFAULT_PAGE_SIZE = 12;

export interface GetVendorLedgerOptions {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
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
  /** Vendor's current advance balance — stored/incremental (see Vendor.advanceBalance), not
   *  recomputed from raw rows like the other totals here. */
  advanceBalance: number;
  /** Cumulative cash disbursed carried in from before startDate (0 when no startDate filter is applied). */
  previousBalance: number;
  total: number;
}> {
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    return { rows: [], totalBilled: 0, totalPaid: 0, remaining: 0, advanceBalance: 0, previousBalance: 0, total: 0 };
  }

  const startDate = options?.startDate?.trim() || undefined;
  const endDate = options?.endDate?.trim() || undefined;

  // Stats (totalBilled/totalPaid/remaining/advanceBalance) always reflect the vendor's full
  // history — only the displayed rows and the running balance react to the date range, exactly
  // like the Machinery ledger (getMachineTotals is all-time; only rows are range-filtered).
  const [vendor, ledgerEntries, payments] = await Promise.all([
    Vendor.findById(vendorId).select("advanceBalance").lean(),
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
      advanceGenerated: e.advanceGenerated,
      paymentMethod: e.paymentMethod,
      referenceId: e.referenceId,
      remarks: e.remarks,
      runningTotal: 0, // filled in below
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

  // `totalPaid` (display stat) counts every dollar ever handed to the vendor, including the
  // portion of an overpayment that became advance instead of settling a due. `remaining`
  // must NOT be reduced by that advance-generating portion — only by whatever actually applied
  // against an outstanding due — so the two are tracked separately.
  let totalPaidFromPayments = 0;
  let totalAppliedToRemainingFromPayments = 0;
  const paymentRows: VendorLedgerRow[] = payments.map((p) => {
    const isAdvance = p.source === "advance";
    if (!isAdvance) totalPaidFromPayments += p.amount;
    totalAppliedToRemainingFromPayments += isAdvance ? p.amount : p.amount - (p.advancePortion ?? 0);
    return {
      type: "payment",
      id: p._id.toString(),
      date: p.date,
      amount: p.amount,
      source: p.source ?? "external",
      paymentMethod: p.paymentMethod,
      referenceId: p.referenceId,
      remarks: p.remarks,
      runningTotal: 0, // filled in below
    };
  });

  const totalPaid = totalPaidFromLedger + totalPaidFromPayments;
  const remaining = Math.max(0, totalBilled - totalPaidFromLedger - totalAppliedToRemainingFromPayments);

  // Running "Balance" (cumulative cash disbursed to the vendor): walk every row chronologically
  // (ascending), from raw stored fields — not the FIFO-redistributed display values above. Each
  // purchase adds whatever cash actually changed hands for it (its bill-settling portion plus
  // whatever became advance — i.e. exactly what was typed in as paidAmount, capped/overflowed
  // into paidAmount+advanceGenerated, which always sums back to the raw amount paid). A fresh
  // external payment adds more cash out. An advance-applied payment isn't new cash paid, nor is
  // it a refund — it's an existing credit (already counted as cash out when it was generated)
  // being spent on a bill instead of sitting unused, so it leaves the running total untouched.
  const ascendingRaw = [
    ...ledgerEntries.map((e) => ({
      key: `purchase:${e._id.toString()}`,
      id: e._id.toString(),
      date: e.date,
      delta: e.paidAmount + (e.advanceGenerated ?? 0),
    })),
    ...payments.map((p) => ({
      key: `payment:${p._id.toString()}`,
      id: p._id.toString(),
      date: p.date,
      delta: p.source === "advance" ? 0 : p.amount,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const previousBalance = startDate
    ? ascendingRaw.filter((r) => r.date < startDate).reduce((s, r) => s + r.delta, 0)
    : 0;

  const runningByKey = new Map<string, number>();
  let running = previousBalance;
  for (const r of ascendingRaw) {
    if (startDate && r.date < startDate) continue;
    if (endDate && r.date > endDate) continue;
    running += r.delta;
    runningByKey.set(r.key, running);
  }

  const allRows = [...purchaseRows, ...paymentRows]
    .filter((r) => (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate))
    .map((r) => ({ ...r, runningTotal: runningByKey.get(`${r.type}:${r.id}`) ?? previousBalance }))
    // Newest first; same-day rows tie-break on Mongo ObjectId (its hex prefix is a creation
    // timestamp), so same-date entries still land newest-created-first deterministically.
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const total = allRows.length;
  const pageSize = Math.min(Math.max(1, options?.pageSize ?? DEFAULT_PAGE_SIZE), 100);
  const page = Math.max(1, options?.page ?? 1);
  const start = (page - 1) * pageSize;
  const rows = allRows.slice(start, start + pageSize);

  return { rows, totalBilled, totalPaid, remaining, advanceBalance: vendor?.advanceBalance ?? 0, previousBalance, total };
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

  let targetEntryId: string | undefined;
  if (input.targetEntryId) {
    if (!mongoose.Types.ObjectId.isValid(input.targetEntryId)) throw new Error("Invalid target entry ID");
    const targetEntry = await ItemLedgerEntry.findById(input.targetEntryId).select("vendorId").lean();
    if (!targetEntry || targetEntry.vendorId.toString() !== vendorId) {
      throw new Error("Target entry does not belong to this vendor");
    }
    targetEntryId = input.targetEntryId;
  }

  const source = input.source ?? "external";
  const { remaining } = await getVendorLedger(vendorId);

  let advancePortion = 0;
  if (source === "advance") {
    if (input.amount > vendor.advanceBalance) {
      throw new Error(
        `Amount ${input.amount.toLocaleString()} exceeds vendor advance balance of ${vendor.advanceBalance.toLocaleString()}`
      );
    }
    if (input.amount > remaining) {
      throw new Error(
        `Amount ${input.amount.toLocaleString()} exceeds vendor remaining balance of ${remaining.toLocaleString()} — there's nothing outstanding to apply it to`
      );
    }
  } else {
    // External payment: whatever exceeds the current remaining becomes a new advance
    // instead of being blocked.
    advancePortion = Math.max(0, input.amount - remaining);
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
            source,
            advancePortion,
            targetEntryId,
            referenceId: input.referenceId?.trim() || undefined,
            remarks: input.remarks?.trim() || undefined,
          },
        ],
        { session }
      );

      if (source === "advance") {
        await Vendor.findByIdAndUpdate(
          vendorId,
          {
            $inc: {
              remaining: -input.amount,
              advanceBalance: -input.amount,
            },
          },
          { session }
        );
      } else {
        const appliedToRemaining = input.amount - advancePortion;
        await Vendor.findByIdAndUpdate(
          vendorId,
          {
            $inc: {
              totalPaid: input.amount,
              remaining: -appliedToRemaining,
              advanceBalance: advancePortion,
            },
          },
          { session }
        );
      }

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

  const vendor = await Vendor.findById(existing.vendorId).lean();
  if (!vendor) throw new Error("Vendor not found");

  const source = existing.source ?? "external";
  if (source === "advance") {
    // Reversing an advance-release just gives the balance and the due back.
  } else if ((existing.advancePortion ?? 0) > vendor.advanceBalance) {
    // This payment's advance portion has since been spent (via an "Apply Advance" payment) —
    // reversing it now would push advanceBalance negative.
    throw new Error(
      `Cannot delete this payment: ${(existing.advancePortion ?? 0).toLocaleString()} of the advance it generated has already been applied elsewhere. Reverse those first.`
    );
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (source === "advance") {
        await Vendor.findByIdAndUpdate(
          existing.vendorId,
          {
            $inc: {
              remaining: existing.amount,
              advanceBalance: existing.amount,
            },
          },
          { session }
        );
      } else {
        const appliedToRemaining = existing.amount - (existing.advancePortion ?? 0);
        await Vendor.findByIdAndUpdate(
          existing.vendorId,
          {
            $inc: {
              totalPaid: -existing.amount,
              remaining: appliedToRemaining,
              advanceBalance: -(existing.advancePortion ?? 0),
            },
          },
          { session }
        );
      }
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
