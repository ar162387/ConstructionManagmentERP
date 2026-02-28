import mongoose from "mongoose";
import { MachineLedgerEntry } from "../models/MachineLedgerEntry.js";
import { MachinePayment } from "../models/MachinePayment.js";
import { MachinePaymentAllocation } from "../models/MachinePaymentAllocation.js";

/**
 * Rebuilds FIFO allocations between machine payments and ledger entries.
 * For a given machine:
 * - Clears existing MachinePaymentAllocation documents.
 * - Orders entries by date (oldest first), then _id.
 * - Orders payments by date (oldest first), then _id.
 * - Allocates each payment amount to the oldest unpaid entries until exhausted.
 */
export async function rebuildMachinePaymentAllocations(machineId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(machineId)) {
    return;
  }

  const machineObjId = new mongoose.Types.ObjectId(machineId);

  const [entries, payments] = await Promise.all([
    MachineLedgerEntry.find({ machineId: machineObjId }).sort({ date: 1, _id: 1 }).lean(),
    MachinePayment.find({ machineId: machineObjId }).sort({ date: 1, _id: 1 }).lean(),
  ]);

  await MachinePaymentAllocation.deleteMany({ machineId: machineObjId });

  if (entries.length === 0 || payments.length === 0) {
    return;
  }

  type AllocationDoc = {
    machineId: mongoose.Types.ObjectId;
    entryId: mongoose.Types.ObjectId;
    paymentId: mongoose.Types.ObjectId;
    amount: number;
  };

  const allocations: AllocationDoc[] = [];

  let entryIndex = 0;
  let entryRemaining = entries[entryIndex].totalCost;

  for (const payment of payments) {
    let paymentRemaining = payment.amount;

    while (paymentRemaining > 0 && entryIndex < entries.length) {
      const allocate = Math.min(paymentRemaining, entryRemaining);
      if (allocate <= 0) {
        break;
      }

      allocations.push({
        machineId: machineObjId,
        entryId: entries[entryIndex]._id,
        paymentId: payment._id,
        amount: allocate,
      });

      paymentRemaining -= allocate;
      entryRemaining -= allocate;

      if (entryRemaining <= 0) {
        entryIndex += 1;
        if (entryIndex >= entries.length) {
          break;
        }
        entryRemaining = entries[entryIndex].totalCost;
      }
    }

    if (entryIndex >= entries.length) {
      break;
    }
  }

  if (allocations.length > 0) {
    await MachinePaymentAllocation.insertMany(allocations);
  }
}
