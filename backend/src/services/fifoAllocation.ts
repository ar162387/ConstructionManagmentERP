import mongoose from "mongoose";
import { ItemLedgerEntry } from "../models/ItemLedgerEntry.js";
import { VendorPayment } from "../models/VendorPayment.js";

export interface FifoEntryInput {
  _id: mongoose.Types.ObjectId;
  date: string;
  totalPrice: number;
  paidAmount: number;
  remaining: number;
}

export interface FifoPaymentInput {
  /** Amount to feed into the FIFO pool — for "external" payments this excludes any portion
   *  that overshot the vendor's remaining and became advance instead; for "advance" payments
   *  (drawn from a pre-existing balance) this is the full amount. See callers for derivation. */
  amount: number;
  /** When set, this payment settles that specific entry directly instead of joining the
   *  general oldest-first pool — e.g. "apply advance to this delivery". Only the portion that
   *  overshoots the target entry's own remaining falls through into the general pool. */
  targetEntryId?: string;
}

export interface FifoAllocation {
  allocatedPaid: number;
  allocatedRemaining: number;
}

/**
 * Runs FIFO allocation of the payment pool across ledger entries (oldest first).
 * Pool = sum(payments) only; ledger paidAmount is already on entries. Each entry gets min(entry.remaining, runningPool) added to its paid amount.
 *
 * Two phases:
 * 1. Payments carrying a targetEntryId settle that entry directly, up to its remaining need —
 *    they never compete with older bills for that money. Whatever overshoots the target entry's
 *    need (or has no live target) falls through into phase 2's pool.
 * 2. The general pool (everything left) is applied oldest-bill-first, exactly as before.
 *
 * Returns a map of entryId -> { allocatedPaid, allocatedRemaining }.
 */
export function runFifo(
  entries: FifoEntryInput[],
  payments: FifoPaymentInput[]
): Map<string, FifoAllocation> {
  // Working copy of paid/remaining per entry, mutated by phase 1 before phase 2 runs.
  const paidById = new Map(entries.map((e) => [e._id.toString(), e.paidAmount]));
  const remainingById = new Map(entries.map((e) => [e._id.toString(), e.remaining]));

  let generalPool = 0;
  for (const p of payments) {
    let amount = p.amount;
    if (p.targetEntryId && remainingById.has(p.targetEntryId)) {
      const need = remainingById.get(p.targetEntryId)!;
      const direct = Math.min(need, amount);
      paidById.set(p.targetEntryId, paidById.get(p.targetEntryId)! + direct);
      remainingById.set(p.targetEntryId, need - direct);
      amount -= direct;
    }
    generalPool += amount;
  }

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const map = new Map<string, FifoAllocation>();
  for (const entry of sorted) {
    const id = entry._id.toString();
    const need = remainingById.get(id)!;
    const allocate = Math.min(need, generalPool);
    generalPool -= allocate;
    const allocatedPaid = paidById.get(id)! + allocate;
    const allocatedRemaining = Math.max(0, entry.totalPrice - allocatedPaid);
    map.set(id, { allocatedPaid, allocatedRemaining });
  }

  return map;
}

/**
 * Loads all ledger entries and payments for a vendor, runs FIFO, returns allocation map keyed by entry id.
 */
export async function getFifoAllocationForVendor(
  vendorId: string
): Promise<Map<string, FifoAllocation>> {
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    return new Map();
  }
  const [entries, payments] = await Promise.all([
    ItemLedgerEntry.find({ vendorId }).lean(),
    VendorPayment.find({ vendorId }).select("amount source advancePortion targetEntryId").lean(),
  ]);
  return runFifo(
    entries.map((e) => ({
      _id: e._id,
      date: e.date,
      totalPrice: e.totalPrice,
      paidAmount: e.paidAmount,
      remaining: e.remaining,
    })),
    payments.map((p) => ({ amount: poolableAmount(p), targetEntryId: p.targetEntryId?.toString() }))
  );
}

/** The portion of a payment that actually pays down existing bills (fed into the FIFO pool).
 *  "external" payments exclude whatever overshot into advance; "advance" payments (drawn from
 *  a pre-existing balance) contribute their full amount, since 100% of it settles a due. */
function poolableAmount(p: {
  amount: number;
  source?: "external" | "advance";
  advancePortion?: number;
  targetEntryId?: unknown;
}): number {
  if (p.source === "advance") return p.amount;
  return p.amount - (p.advancePortion ?? 0);
}

/** Bulk load FIFO allocation for multiple vendors in two DB queries. Returns vendorId -> (entryId -> allocation). */
export async function getFifoAllocationForVendorsBulk(
  vendorIds: string[]
): Promise<Map<string, Map<string, FifoAllocation>>> {
  const validIds = vendorIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) return new Map();
  const objectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));
  const [allEntries, allPayments] = await Promise.all([
    ItemLedgerEntry.find({ vendorId: { $in: objectIds } }).lean(),
    VendorPayment.find({ vendorId: { $in: objectIds } })
      .select("amount vendorId source advancePortion targetEntryId")
      .lean(),
  ]);
  const entriesByVendor = new Map<string, FifoEntryInput[]>();
  const paymentsByVendor = new Map<string, FifoPaymentInput[]>();
  for (const e of allEntries) {
    const vid = e.vendorId.toString();
    if (!entriesByVendor.has(vid)) entriesByVendor.set(vid, []);
    entriesByVendor.get(vid)!.push({
      _id: e._id,
      date: e.date,
      totalPrice: e.totalPrice,
      paidAmount: e.paidAmount,
      remaining: e.remaining,
    });
  }
  for (const p of allPayments) {
    const vid = p.vendorId.toString();
    if (!paymentsByVendor.has(vid)) paymentsByVendor.set(vid, []);
    paymentsByVendor.get(vid)!.push({ amount: poolableAmount(p), targetEntryId: p.targetEntryId?.toString() });
  }
  const result = new Map<string, Map<string, FifoAllocation>>();
  for (const vid of validIds) {
    const entries = entriesByVendor.get(vid) ?? [];
    const payments = paymentsByVendor.get(vid) ?? [];
    result.set(vid, runFifo(entries, payments));
  }
  return result;
}
