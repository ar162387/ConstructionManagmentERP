import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/builderp";

const TARGET_NAMES = ["Green Corridor", "Rasool Pump"];

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  const projects = await db.collection("projects").find({ name: { $in: TARGET_NAMES } }).toArray();
  console.log("=== Target projects resolved ===");
  for (const p of projects) console.log(p._id.toString(), "-", p.name, "- status:", p.status);
  const ids = projects.map((p) => p._id);
  const idStrs = ids.map((i) => i.toString());

  if (ids.length !== 2) {
    console.log("WARNING: expected 2 projects, found", ids.length);
  }

  async function count(coll: string, filter: any) {
    return db.collection(coll).countDocuments(filter);
  }

  console.log("\n=== Directly project-scoped collections ===");
  for (const coll of ["contractors", "employees", "machines", "vendors", "consumableitems", "itemledgerentries", "stockconsumptionentries", "expenses", "projectbalanceadjustments", "contractorentries"]) {
    const c = await count(coll, { projectId: { $in: ids } });
    console.log(coll.padEnd(28), c);
  }

  console.log("\n=== Bank transactions tied to these projects ===");
  const bankTx = await db.collection("banktransactions").find({ projectId: { $in: ids } }).toArray();
  console.log("count:", bankTx.length);
  const byAccount: Record<string, { inflow: number; outflow: number }> = {};
  for (const tx of bankTx) {
    const acc = tx.accountId.toString();
    byAccount[acc] ??= { inflow: 0, outflow: 0 };
    if (tx.type === "inflow") byAccount[acc].inflow += tx.amount;
    else byAccount[acc].outflow += tx.amount;
  }
  for (const [accId, sums] of Object.entries(byAccount)) {
    const acc = await db.collection("bankaccounts").findOne({ _id: new mongoose.Types.ObjectId(accId) });
    console.log(` account "${acc?.name}" (${accId}): inflow ${sums.inflow}, outflow ${sums.outflow}, current balance now ${acc?.currentBalance}`);
  }

  console.log("\n=== Non-consumable ledger entries tied to these projects ===");
  const ncEntries = await db.collection("nonconsumableledgerentries").find({
    $or: [{ projectTo: { $in: ids } }, { projectFrom: { $in: ids } }, { expenseProjectId: { $in: ids } }],
  }).toArray();
  console.log("count:", ncEntries.length);
  const itemIds = new Set(ncEntries.map((e) => e.itemId.toString()));
  for (const itemId of itemIds) {
    const item = await db.collection("nonconsumableitems").findOne({ _id: new mongoose.Types.ObjectId(itemId) });
    const related = ncEntries.filter((e) => e.itemId.toString() === itemId);
    console.log(` item "${item?.name}" (${itemId}): ${related.length} entries affected. current totals: total=${item?.totalQuantity} store=${item?.companyStore} inUse=${item?.inUse} repair=${item?.underRepair} lost=${item?.lost}`);
  }

  console.log("\n=== Contractor / Machine / Vendor children (via parent projectId) ===");
  const contractorIds = (await db.collection("contractors").find({ projectId: { $in: ids } }).project({ _id: 1 }).toArray()).map((d) => d._id);
  const machineIds = (await db.collection("machines").find({ projectId: { $in: ids } }).project({ _id: 1 }).toArray()).map((d) => d._id);
  const vendorIds = (await db.collection("vendors").find({ projectId: { $in: ids } }).project({ _id: 1 }).toArray()).map((d) => d._id);
  const employeeIds = (await db.collection("employees").find({ projectId: { $in: ids } }).project({ _id: 1 }).toArray()).map((d) => d._id);

  console.log("contractorPayments:", await count("contractorpayments", { contractorId: { $in: contractorIds } }));
  console.log("contractorPaymentAllocations:", await count("contractorpaymentallocations", { contractorId: { $in: contractorIds } }));
  console.log("machineLedgerEntries (direct projectId, cross check):", await count("machineledgerentries", { projectId: { $in: ids } }));
  console.log("machinePayments:", await count("machinepayments", { machineId: { $in: machineIds } }));
  console.log("machinePaymentAllocations:", await count("machinepaymentallocations", { machineId: { $in: machineIds } }));
  console.log("vendorPayments:", await count("vendorpayments", { vendorId: { $in: vendorIds } }));
  console.log("employeeAttendances:", await count("employeeattendances", { employeeId: { $in: employeeIds } }));
  console.log("employeePayments:", await count("employeepayments", { employeeId: { $in: employeeIds } }));

  // Check for vendors referenced by item ledger entries that DON'T belong to target projects (cross-project vendor sharing check)
  const foreignVendorRefs = await db.collection("itemledgerentries").aggregate([
    { $match: { projectId: { $in: ids } } },
    { $lookup: { from: "vendors", localField: "vendorId", foreignField: "_id", as: "v" } },
    { $unwind: "$v" },
    { $match: { "v.projectId": { $nin: ids } } },
  ]).toArray();
  console.log("\nItem ledger entries (in target projects) referencing a vendor OUTSIDE target projects:", foreignVendorRefs.length);

  console.log("\n=== Audit logs referencing these projects ===");
  console.log("auditlogs (projectId field match):", await count("auditlogs", { projectId: { $in: idStrs } }));

  console.log("\n=== Users assigned to these projects (site managers) ===");
  const users = await db.collection("users").find({ assignedProjectId: { $in: idStrs } }).toArray();
  for (const u of users) console.log(" -", u.name, u.email, "-> assigned to", u.assignedProjectName);
  if (users.length === 0) console.log(" none");

  console.log("\n=== Sanity: the two projects to KEEP (must be untouched) ===");
  const keep = await db.collection("projects").find({ name: { $in: ["Rasoool Petroleum", "Jhang Labour Colony"] } }).toArray();
  for (const p of keep) console.log(p._id.toString(), "-", p.name, "- balance:", p.balance, "spent:", p.spent);

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
