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
  amount: number;
}

export interface FifoAllocation {
  allocatedPaid: number;
  allocatedRemaining: number;
}

/**
 * Runs FIFO allocation of the payment pool across ledger entries (oldest first).
 * Pool = sum(payments) only; ledger paidAmount is already on entries. Each entry gets min(entry.remaining, runningPool) added to its paid amount.
 * Returns a map of entryId -> { allocatedPaid, allocatedRemaining }.
 */
export function runFifo(
  entries: FifoEntryInput[],
  payments: FifoPaymentInput[]
): Map<string, FifoAllocation> {
  const map = new Map<string, FifoAllocation>();
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  let runningPool = payments.reduce((s, p) => s + p.amount, 0);

  for (const entry of sorted) {
    const need = entry.remaining;
    const allocate = Math.min(need, runningPool);
    runningPool -= allocate;
    const allocatedPaid = entry.paidAmount + allocate;
    const allocatedRemaining = Math.max(0, entry.totalPrice - allocatedPaid);
    map.set(entry._id.toString(), { allocatedPaid, allocatedRemaining });
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
    VendorPayment.find({ vendorId }).select("amount").lean(),
  ]);
  return runFifo(
    entries.map((e) => ({
      _id: e._id,
      date: e.date,
      totalPrice: e.totalPrice,
      paidAmount: e.paidAmount,
      remaining: e.remaining,
    })),
    payments.map((p) => ({ amount: p.amount }))
  );
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
    VendorPayment.find({ vendorId: { $in: objectIds } }).select("amount vendorId").lean(),
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
    paymentsByVendor.get(vid)!.push({ amount: p.amount });
  }
  const result = new Map<string, Map<string, FifoAllocation>>();
  for (const vid of validIds) {
    const entries = entriesByVendor.get(vid) ?? [];
    const payments = paymentsByVendor.get(vid) ?? [];
    result.set(vid, runFifo(entries, payments));
  }
  return result;
}
