import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/builderp";
const TARGET_NAMES = ["Green Corridor", "Rasool Pump"];
const KEEP_NAMES = ["Rasoool Petroleum", "Jhang Labour Colony"];

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  const targets = await db.collection("projects").find({ name: { $in: TARGET_NAMES } }).toArray();
  if (targets.length !== 2) throw new Error(`Expected 2 target projects, found ${targets.length}`);
  const ids = targets.map((p) => p._id);
  const idStrs = ids.map((i) => i.toString());

  // Snapshot the "keep" side for before/after comparison.
  const keepBefore = await db.collection("projects").find({ name: { $in: KEEP_NAMES } }).toArray();
  const bankAccountsBefore = await db.collection("bankaccounts").find({}).toArray();
  const ncItemIdsAffected = new Set(
    (
      await db
        .collection("nonconsumableledgerentries")
        .find({ $or: [{ projectTo: { $in: ids } }, { projectFrom: { $in: ids } }, { expenseProjectId: { $in: ids } }] })
        .toArray()
    ).map((e: any) => e.itemId.toString())
  );

  const contractorIds = (await db.collection("contractors").find({ projectId: { $in: ids } }).project({ _id: 1 }).toArray()).map((d) => d._id);
  const machineIds = (await db.collection("machines").find({ projectId: { $in: ids } }).project({ _id: 1 }).toArray()).map((d) => d._id);
  const vendorIds = (await db.collection("vendors").find({ projectId: { $in: ids } }).project({ _id: 1 }).toArray()).map((d) => d._id);
  const employeeIds = (await db.collection("employees").find({ projectId: { $in: ids } }).project({ _id: 1 }).toArray()).map((d) => d._id);
  const consumableItemIds = (await db.collection("consumableitems").find({ projectId: { $in: ids } }).project({ _id: 1 }).toArray()).map((d) => d._id);

  const session = mongoose.connection.getClient().startSession();
  const deleted: Record<string, number> = {};

  try {
    await session.withTransaction(async () => {
      const del = async (coll: string, filter: any) => {
        const res = await db.collection(coll).deleteMany(filter, { session });
        deleted[coll] = (deleted[coll] ?? 0) + res.deletedCount;
      };

      // --- Contractors and children ---
      await del("contractorpaymentallocations", { contractorId: { $in: contractorIds } });
      await del("contractorpayments", { contractorId: { $in: contractorIds } });
      await del("contractorentries", { $or: [{ contractorId: { $in: contractorIds } }, { projectId: { $in: ids } }] });
      await del("contractors", { _id: { $in: contractorIds } });

      // --- Machines and children ---
      await del("machinepaymentallocations", { machineId: { $in: machineIds } });
      await del("machinepayments", { machineId: { $in: machineIds } });
      await del("machineledgerentries", { $or: [{ machineId: { $in: machineIds } }, { projectId: { $in: ids } }] });
      await del("machines", { _id: { $in: machineIds } });

      // --- Employees and children ---
      await del("employeeattendances", { employeeId: { $in: employeeIds } });
      await del("employeepayments", { employeeId: { $in: employeeIds } });
      await del("employees", { _id: { $in: employeeIds } });

      // --- Vendors and children ---
      await del("vendorpayments", { vendorId: { $in: vendorIds } });
      await del("vendors", { _id: { $in: vendorIds } });

      // --- Consumable items and children ---
      await del("itemledgerentries", { projectId: { $in: ids } });
      await del("stockconsumptionentries", { projectId: { $in: ids } });
      await del("consumableitems", { _id: { $in: consumableItemIds } });

      // --- Direct project-scoped, no side effects elsewhere ---
      await del("expenses", { projectId: { $in: ids } });
      await del("projectbalanceadjustments", { projectId: { $in: ids } });

      // --- Bank transactions: reverse BankAccount balances, then delete ---
      const bankTx = await db.collection("banktransactions").find({ projectId: { $in: ids } }, { session }).toArray();
      for (const tx of bankTx) {
        if (tx.type === "inflow") {
          await db.collection("bankaccounts").updateOne(
            { _id: tx.accountId },
            { $inc: { currentBalance: -tx.amount, totalInflow: -tx.amount } },
            { session }
          );
        } else {
          await db.collection("bankaccounts").updateOne(
            { _id: tx.accountId },
            { $inc: { currentBalance: tx.amount, totalOutflow: -tx.amount } },
            { session }
          );
        }
      }
      await del("banktransactions", { projectId: { $in: ids } });

      // --- Non-consumable ledger entries: delete, then recompute affected item balances by full replay ---
      await del("nonconsumableledgerentries", {
        $or: [{ projectTo: { $in: ids } }, { projectFrom: { $in: ids } }, { expenseProjectId: { $in: ids } }],
      });
      for (const itemIdStr of ncItemIdsAffected) {
        const itemId = new mongoose.Types.ObjectId(itemIdStr);
        const entries = await db
          .collection("nonconsumableledgerentries")
          .find({ itemId }, { session })
          .sort({ date: 1, createdAt: 1 })
          .toArray();

        let companyStore = 0;
        const inUseByProject = new Map<string, number>();
        let underRepair = 0;
        let lost = 0;
        for (const e of entries) {
          const qty = e.quantity;
          const toId = e.projectTo?.toString();
          const fromId = e.projectFrom?.toString();
          switch (e.eventType) {
            case "Purchase":
              companyStore += qty;
              break;
            case "AssignToProject":
              if (!toId) break;
              companyStore -= qty;
              inUseByProject.set(toId, (inUseByProject.get(toId) ?? 0) + qty);
              break;
            case "ReturnToCompany": {
              if (!fromId) break;
              const cur = inUseByProject.get(fromId) ?? 0;
              inUseByProject.set(fromId, Math.max(0, cur - qty));
              companyStore += qty;
              break;
            }
            case "Repair": {
              if (!fromId) break;
              const cur = inUseByProject.get(fromId) ?? 0;
              inUseByProject.set(fromId, Math.max(0, cur - qty));
              underRepair += qty;
              break;
            }
            case "ReturnFromRepair":
              underRepair -= qty;
              companyStore += qty;
              break;
            case "MarkLost": {
              if (!fromId) break;
              const cur = inUseByProject.get(fromId) ?? 0;
              inUseByProject.set(fromId, Math.max(0, cur - qty));
              lost += qty;
              break;
            }
          }
        }
        const inUse = [...inUseByProject.values()].reduce((a, b) => a + b, 0);
        const totalQuantity = Math.max(0, companyStore) + inUse + underRepair + lost;
        await db.collection("nonconsumableitems").updateOne(
          { _id: itemId },
          { $set: { companyStore: Math.max(0, companyStore), inUse, underRepair, lost, totalQuantity } },
          { session }
        );
      }

      // --- Audit logs referencing these projects ---
      await del("auditlogs", { projectId: { $in: idStrs } });

      // --- Clear dangling site-manager assignments ---
      await db.collection("users").updateMany(
        { assignedProjectId: { $in: idStrs } },
        { $unset: { assignedProjectId: "", assignedProjectName: "" } },
        { session }
      );

      // --- Finally, the projects themselves ---
      await del("projects", { _id: { $in: ids } });
    });
  } finally {
    await session.endSession();
  }

  console.log("=== Deletion counts ===");
  for (const [k, v] of Object.entries(deleted)) console.log(k.padEnd(28), v);

  console.log("\n=== Post-verification ===");
  const keepAfter = await db.collection("projects").find({ name: { $in: KEEP_NAMES } }).toArray();
  for (const before of keepBefore) {
    const after = keepAfter.find((p) => p._id.toString() === before._id.toString());
    const unchanged = JSON.stringify(before) === JSON.stringify(after);
    console.log(`${before.name}: ${unchanged ? "UNCHANGED ✓" : "**CHANGED — INVESTIGATE**"}`);
  }

  const stillThere = await db.collection("projects").find({ name: { $in: TARGET_NAMES } }).toArray();
  console.log(`\nTarget projects remaining (should be 0): ${stillThere.length}`);

  console.log("\n=== Bank accounts after ===");
  const accsAfter = await db.collection("bankaccounts").find({}).toArray();
  for (const a of accsAfter) {
    const before = bankAccountsBefore.find((b) => b._id.toString() === a._id.toString());
    console.log(
      ` "${a.name}": currentBalance ${before?.currentBalance} -> ${a.currentBalance} | totalInflow ${before?.totalInflow} -> ${a.totalInflow} | totalOutflow ${before?.totalOutflow} -> ${a.totalOutflow}`
    );
  }

  console.log("\n=== Non-consumable items after ===");
  for (const itemIdStr of ncItemIdsAffected) {
    const item = await db.collection("nonconsumableitems").findOne({ _id: new mongoose.Types.ObjectId(itemIdStr) });
    console.log(` "${item?.name}": total=${item?.totalQuantity} store=${item?.companyStore} inUse=${item?.inUse} repair=${item?.underRepair} lost=${item?.lost}`);
  }

  const remainingBankTx = await db.collection("banktransactions").countDocuments({ projectId: { $in: ids } });
  const remainingNcEntries = await db.collection("nonconsumableledgerentries").countDocuments({
    $or: [{ projectTo: { $in: ids } }, { projectFrom: { $in: ids } }, { expenseProjectId: { $in: ids } }],
  });
  console.log(`\nRemaining bank tx for target projects (should be 0): ${remainingBankTx}`);
  console.log(`Remaining NC ledger entries for target projects (should be 0): ${remainingNcEntries}`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("PURGE FAILED — transaction rolled back:", e);
  process.exit(1);
});
