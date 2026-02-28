import mongoose from "mongoose";
import { ContractorEntry } from "../models/ContractorEntry.js";
import { ContractorPayment } from "../models/ContractorPayment.js";
import { ContractorPaymentAllocation } from "../models/ContractorPaymentAllocation.js";

/**
 * Rebuilds FIFO allocations between contractor payments and entries.
 * For a given contractor:
 * - Clears existing ContractorPaymentAllocation documents.
 * - Orders entries by date (oldest first), then _id.
 * - Orders payments by date (oldest first), then _id.
 * - Allocates each payment amount to the oldest unpaid entries until exhausted.
 */
export async function rebuildContractorPaymentAllocations(contractorId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(contractorId)) {
    return;
  }

  const contractorObjId = new mongoose.Types.ObjectId(contractorId);

  const [entries, payments] = await Promise.all([
    ContractorEntry.find({ contractorId: contractorObjId }).sort({ date: 1, _id: 1 }).lean(),
    ContractorPayment.find({ contractorId: contractorObjId }).sort({ date: 1, _id: 1 }).lean(),
  ]);

  await ContractorPaymentAllocation.deleteMany({ contractorId: contractorObjId });

  if (entries.length === 0 || payments.length === 0) {
    return;
  }

  type AllocationDoc = {
    contractorId: mongoose.Types.ObjectId;
    entryId: mongoose.Types.ObjectId;
    paymentId: mongoose.Types.ObjectId;
    amount: number;
  };

  const allocations: AllocationDoc[] = [];

  let entryIndex = 0;
  let entryRemaining = entries[entryIndex].amount;

  for (const payment of payments) {
    let paymentRemaining = payment.amount;

    while (paymentRemaining > 0 && entryIndex < entries.length) {
      const allocate = Math.min(paymentRemaining, entryRemaining);
      if (allocate <= 0) {
        break;
      }

      allocations.push({
        contractorId: contractorObjId,
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
        entryRemaining = entries[entryIndex].amount;
      }
    }

    if (entryIndex >= entries.length) {
      break;
    }
  }

  if (allocations.length > 0) {
    await ContractorPaymentAllocation.insertMany(allocations);
  }
}

