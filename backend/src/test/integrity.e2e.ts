import "dotenv/config";
import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { Contractor } from "../models/Contractor.js";
import { ContractorEntry } from "../models/ContractorEntry.js";
import { ContractorPayment } from "../models/ContractorPayment.js";
import { ContractorPaymentAllocation } from "../models/ContractorPaymentAllocation.js";
import { rebuildContractorPaymentAllocations } from "../services/contractorPaymentAllocationService.js";
import { getContractorLedger } from "../services/contractorLedgerService.js";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/builderp-test";

function assertCondition(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(`Integrity test failed: ${message}`);
  }
}

async function testContractorFifoAcrossMonths() {
  console.log("Running contractor FIFO allocation test...");

  // Create an isolated test project.
  const project = await Project.create({
    name: "FIFO Test Project",
    description: "Temporary project for contractor FIFO integrity test",
    allocatedBudget: 0,
    status: "active",
    startDate: "2025-01-01",
    endDate: "",
    spent: 0,
  });

  try {
    // Clean any previous test data for this project/contractor name.
    await Contractor.deleteMany({ projectId: project._id, name: "FIFO Test Contractor" });

    const contractor = await Contractor.create({
      projectId: project._id,
      name: "FIFO Test Contractor",
      phone: "",
      description: "",
    });

    await ContractorEntry.deleteMany({ projectId: project._id });
    await ContractorPayment.deleteMany({ contractorId: contractor._id });
    await ContractorPaymentAllocation.deleteMany({ contractorId: contractor._id });

    // Scenario:
    // - January: one entry of 150,000.
    // - February: one payment of 150,000.
    // Expectation:
    // - January ledger shows TotalAmount=150,000, PaidAmount=150,000, Remaining=0.
    // - February ledger has no entries, so totals remain 0.

    await ContractorEntry.create({
      contractorId: contractor._id,
      projectId: project._id,
      date: "2025-01-10",
      amount: 150_000,
      remarks: "January work",
    });

    await ContractorPayment.create({
      contractorId: contractor._id,
      date: "2025-02-05",
      amount: 150_000,
      paymentMethod: "Cash",
      referenceId: "TEST-JAN-FEB",
    });

    await rebuildContractorPaymentAllocations(contractor._id.toString());

    const janLedger = await getContractorLedger(project._id.toString(), "2025-01", {
      contractorId: contractor._id.toString(),
    });

    assertCondition(
      janLedger.totalAmount === 150_000,
      `Jan totalAmount expected 150000, got ${janLedger.totalAmount}`
    );
    assertCondition(
      janLedger.totalPaid === 150_000,
      `Jan totalPaid expected 150000, got ${janLedger.totalPaid}`
    );
    assertCondition(
      janLedger.remaining === 0,
      `Jan remaining expected 0, got ${janLedger.remaining}`
    );

    const febLedger = await getContractorLedger(project._id.toString(), "2025-02", {
      contractorId: contractor._id.toString(),
    });

    assertCondition(
      febLedger.totalAmount === 0,
      `Feb totalAmount expected 0, got ${febLedger.totalAmount}`
    );
    assertCondition(
      febLedger.totalPaid === 0,
      `Feb totalPaid expected 0, got ${febLedger.totalPaid}`
    );
    assertCondition(
      febLedger.remaining === 0,
      `Feb remaining expected 0, got ${febLedger.remaining}`
    );

    console.log("Contractor FIFO allocation test passed.");
  } finally {
    // Clean up test-specific data while leaving other data untouched.
    await ContractorEntry.deleteMany({ projectId: project._id });
    await ContractorPayment.deleteMany({ contractorId: { $in: await Contractor.find({ projectId: project._id }).distinct("_id") } });
    await ContractorPaymentAllocation.deleteMany({ contractorId: { $in: await Contractor.find({ projectId: project._id }).distinct("_id") } });
    await Contractor.deleteMany({ projectId: project._id });
    await Project.findByIdAndDelete(project._id);
  }
}

async function main() {
  console.log("Starting integrity tests...");
  await mongoose.connect(MONGODB_URI);

  try {
    await testContractorFifoAcrossMonths();
    console.log("All integrity tests passed.");
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

