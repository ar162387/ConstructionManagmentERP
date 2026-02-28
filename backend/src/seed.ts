import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { User } from "./models/User.js";
import { Project } from "./models/Project.js";
import { Vendor } from "./models/Vendor.js";
import { ConsumableItem } from "./models/ConsumableItem.js";
import { ItemLedgerEntry } from "./models/ItemLedgerEntry.js";
import { StockConsumptionEntry } from "./models/StockConsumptionEntry.js";
import { VendorPayment } from "./models/VendorPayment.js";
import { NonConsumableCategory } from "./models/NonConsumableCategory.js";
import { NonConsumableItem } from "./models/NonConsumableItem.js";
import { NonConsumableLedgerEntry } from "./models/NonConsumableLedgerEntry.js";
import { Contractor } from "./models/Contractor.js";
import { ContractorEntry } from "./models/ContractorEntry.js";
import { ContractorPayment } from "./models/ContractorPayment.js";
import { Expense } from "./models/Expense.js";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/builderp";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const hash = await bcrypt.hash("password123", 10);

  // --- Projects (at least two) ---
  let project1Id: mongoose.Types.ObjectId;
  let project2Id: mongoose.Types.ObjectId;
  let firstProjectName = "Skyline Tower";

  const existingProjects = await Project.countDocuments();
  if (existingProjects === 0) {
    const created = await Project.insertMany([
      { name: "Skyline Tower", description: "32-floor commercial tower", allocatedBudget: 45000000, status: "active", startDate: "2025-01-15", endDate: "2027-06-30", spent: 12500000 },
      { name: "Green Valley Residency", description: "Residential complex with 120 units", allocatedBudget: 28000000, status: "active", startDate: "2025-03-01", endDate: "2026-12-31", spent: 8200000 },
      { name: "Metro Bridge Expansion", description: "Highway bridge expansion project", allocatedBudget: 15000000, status: "on_hold", startDate: "2025-06-01", endDate: "2026-08-15", spent: 3100000 },
      { name: "Civic Center Renovation", description: "Government civic center renovation", allocatedBudget: 8500000, status: "completed", startDate: "2024-04-01", endDate: "2025-09-30", spent: 8200000 },
    ]);
    project1Id = created[0]._id;
    project2Id = created[1]._id;
    firstProjectName = created[0].name;
    console.log("Seeded 4 projects");
  } else {
    const projects = await Project.find().limit(2).lean();
    if (!projects[0] || !projects[1]) throw new Error("Need at least 2 projects for seed");
    project1Id = projects[0]._id as mongoose.Types.ObjectId;
    project2Id = projects[1]._id as mongoose.Types.ObjectId;
    firstProjectName = projects[0].name;
  }

  // --- Vendors: ensure we have vendors for both projects ---
  const vendorsP1 = await Vendor.find({ projectId: project1Id }).lean();
  const vendorsP2 = await Vendor.find({ projectId: project2Id }).lean();

  if (vendorsP1.length === 0) {
    await Vendor.insertMany([
      { projectId: project1Id, name: "ABC Traders", phone: "+92 98765 43210", description: "Cement & building materials", totalBilled: 0, totalPaid: 0, remaining: 0 },
      { projectId: project1Id, name: "XYZ Suppliers", phone: "+92 98765 43211", description: "Steel & iron supplies", totalBilled: 0, totalPaid: 0, remaining: 0 },
      { projectId: project1Id, name: "Metro Materials", phone: "+92 98765 43212", description: "General construction materials", totalBilled: 0, totalPaid: 0, remaining: 0 },
      { projectId: project1Id, name: "SafetyFirst Co.", phone: "+92 98765 43213", description: "Safety equipment", totalBilled: 0, totalPaid: 0, remaining: 0 },
    ]);
    console.log("Seeded 4 vendors for project 1");
  }
  if (vendorsP2.length === 0) {
    await Vendor.insertMany([
      { projectId: project2Id, name: "Green Valley Cement", phone: "+92 98765 43220", description: "Cement supplier for Green Valley", totalBilled: 0, totalPaid: 0, remaining: 0 },
      { projectId: project2Id, name: "Residency Bricks Ltd", phone: "+92 98765 43221", description: "Bricks and blocks", totalBilled: 0, totalPaid: 0, remaining: 0 },
    ]);
    console.log("Seeded 2 vendors for project 2");
  }

  // Re-fetch vendor IDs for ledger/payment seeding
  const v1List = await Vendor.find({ projectId: project1Id }).lean();
  const v2List = await Vendor.find({ projectId: project2Id }).lean();
  const vendor1Id = v1List[0]._id;
  const vendor2Id = v1List[1]._id;
  const vendor3Id = v1List[2]._id;
  const vendorP2_1Id = v2List[0]._id;
  const vendorP2_2Id = v2List[1]._id;

  // --- Consumable items for project 1 and project 2 ---
  const existingItems = await ConsumableItem.countDocuments();
  if (existingItems === 0) {
    const itemsP1 = await ConsumableItem.insertMany([
      { projectId: project1Id, name: "Cement", unit: "bag", currentStock: 0, totalPurchased: 0, totalAmount: 0, totalPaid: 0, totalPending: 0 },
      { projectId: project1Id, name: "Steel Bars (10mm)", unit: "kg", currentStock: 0, totalPurchased: 0, totalAmount: 0, totalPaid: 0, totalPending: 0 },
      { projectId: project1Id, name: "Sand", unit: "cft", currentStock: 0, totalPurchased: 0, totalAmount: 0, totalPaid: 0, totalPending: 0 },
      { projectId: project1Id, name: "Bricks", unit: "piece", currentStock: 0, totalPurchased: 0, totalAmount: 0, totalPaid: 0, totalPending: 0 },
      { projectId: project1Id, name: "Aggregate (20mm)", unit: "cft", currentStock: 0, totalPurchased: 0, totalAmount: 0, totalPaid: 0, totalPending: 0 },
    ]);
    const itemsP2 = await ConsumableItem.insertMany([
      { projectId: project2Id, name: "Cement", unit: "bag", currentStock: 0, totalPurchased: 0, totalAmount: 0, totalPaid: 0, totalPending: 0 },
      { projectId: project2Id, name: "Bricks", unit: "piece", currentStock: 0, totalPurchased: 0, totalAmount: 0, totalPaid: 0, totalPending: 0 },
      { projectId: project2Id, name: "Sand", unit: "cft", currentStock: 0, totalPurchased: 0, totalAmount: 0, totalPaid: 0, totalPending: 0 },
    ]);
    console.log("Seeded consumable items for project 1 (5) and project 2 (3)");

    const cementP1Id = itemsP1[0]._id;
    const steelP1Id = itemsP1[1]._id;
    const sandP1Id = itemsP1[2]._id;
    const cementP2Id = itemsP2[0]._id;
    const bricksP2Id = itemsP2[1]._id;

    // --- Item ledger entries (project 1: Cement + Steel; project 2: Cement + Bricks) ---
    await ItemLedgerEntry.insertMany([
      { projectId: project1Id, itemId: cementP1Id, vendorId: vendor1Id, date: "2025-12-01", quantity: 500, unitPrice: 350, totalPrice: 175000, paidAmount: 175000, remaining: 0, paymentMethod: "Bank", biltyNumber: "BL-1234", vehicleNumber: "KA-01-AB-1234", referenceId: "CHQ-5678", remarks: "Bulk order" },
      { projectId: project1Id, itemId: cementP1Id, vendorId: vendor1Id, date: "2025-12-15", quantity: 300, unitPrice: 355, totalPrice: 106500, paidAmount: 80000, remaining: 26500, paymentMethod: "Cash", vehicleNumber: "KA-02-CD-5678" },
      { projectId: project1Id, itemId: cementP1Id, vendorId: vendor3Id, date: "2026-01-05", quantity: 200, unitPrice: 345, totalPrice: 69000, paidAmount: 0, remaining: 69000, paymentMethod: "Bank", biltyNumber: "BL-1290", referenceId: "CHQ-5690" },
      { projectId: project1Id, itemId: steelP1Id, vendorId: vendor2Id, date: "2026-01-10", quantity: 2000, unitPrice: 80, totalPrice: 160000, paidAmount: 160000, remaining: 0, paymentMethod: "Online", referenceId: "TXN-Steel-01" },
      { projectId: project1Id, itemId: sandP1Id, vendorId: vendor3Id, date: "2026-01-12", quantity: 500, unitPrice: 50, totalPrice: 25000, paidAmount: 25000, remaining: 0, paymentMethod: "Cash" },
      { projectId: project2Id, itemId: cementP2Id, vendorId: vendorP2_1Id, date: "2026-01-08", quantity: 400, unitPrice: 348, totalPrice: 139200, paidAmount: 100000, remaining: 39200, paymentMethod: "Bank", referenceId: "CHQ-GV-01" },
      { projectId: project2Id, itemId: bricksP2Id, vendorId: vendorP2_2Id, date: "2026-01-14", quantity: 10000, unitPrice: 8, totalPrice: 80000, paidAmount: 80000, remaining: 0, paymentMethod: "Cash", remarks: "Initial stock" },
    ]);
    console.log("Seeded 7 item ledger entries");

    // --- Update ConsumableItem totals from ledger (stock in = sum of ledger quantity; amounts from ledger) ---
    const ledgerByItem = await ItemLedgerEntry.aggregate([
      { $group: { _id: "$itemId", totalQty: { $sum: "$quantity" }, totalAmount: { $sum: "$totalPrice" }, totalPaid: { $sum: "$paidAmount" }, totalRemaining: { $sum: "$remaining" } } },
    ]);
    for (const row of ledgerByItem) {
      await ConsumableItem.findByIdAndUpdate(row._id, {
        totalPurchased: row.totalQty,
        currentStock: row.totalQty,
        totalAmount: row.totalAmount,
        totalPaid: row.totalPaid,
        totalPending: row.totalRemaining,
      });
    }

    // --- Stock consumption (project 1: consume 50 Cement, 100 Sand; project 2: consume 30 Cement) ---
    await StockConsumptionEntry.insertMany([
      { projectId: project1Id, date: "2026-01-12", remarks: "Floor 5 slab", items: [{ itemId: cementP1Id, quantityUsed: 50 }, { itemId: sandP1Id, quantityUsed: 100 }] },
      { projectId: project1Id, date: "2026-01-18", remarks: "Column work", items: [{ itemId: cementP1Id, quantityUsed: 80 }] },
      { projectId: project2Id, date: "2026-01-16", remarks: "Block A foundation", items: [{ itemId: cementP2Id, quantityUsed: 30 }, { itemId: bricksP2Id, quantityUsed: 500 }] },
    ]);
    // Deduct consumed from currentStock
    await ConsumableItem.findByIdAndUpdate(cementP1Id, { $inc: { currentStock: -130 } }); // 50 + 80
    await ConsumableItem.findByIdAndUpdate(sandP1Id, { $inc: { currentStock: -100 } });
    await ConsumableItem.findByIdAndUpdate(cementP2Id, { $inc: { currentStock: -30 } });
    await ConsumableItem.findByIdAndUpdate(bricksP2Id, { $inc: { currentStock: -500 } });
    console.log("Seeded 3 stock consumption entries");

    // --- Vendor payments (against due from ledger) ---
    await VendorPayment.insertMany([
      { vendorId: vendor1Id, date: "2026-01-20", amount: 26500, paymentMethod: "Bank", referenceId: "CHQ-ABC-01", remarks: "Settled Dec 15 ledger balance" },
      { vendorId: vendorP2_1Id, date: "2026-01-22", amount: 20000, paymentMethod: "Online", referenceId: "TXN-GV-01", remarks: "Partial payment" },
    ]);
    console.log("Seeded 2 vendor payments");

    // --- Update Vendor totals: totalBilled = sum(ledger.totalPrice), totalPaid = sum(ledger.paidAmount) + sum(payments), remaining = totalBilled - totalPaid ---
    const ledgerByVendor = await ItemLedgerEntry.aggregate([
      { $group: { _id: "$vendorId", totalBilled: { $sum: "$totalPrice" }, paidFromLedger: { $sum: "$paidAmount" }, remaining: { $sum: "$remaining" } } },
    ]);
    const paymentsByVendor = await VendorPayment.aggregate([
      { $group: { _id: "$vendorId", totalPayments: { $sum: "$amount" } } },
    ]);
    const paymentMap = new Map(paymentsByVendor.map((p) => [p._id.toString(), p.totalPayments]));
    for (const row of ledgerByVendor) {
      const extraPaid = paymentMap.get(row._id.toString()) ?? 0;
      const totalPaid = row.paidFromLedger + extraPaid;
      const remaining = Math.max(0, row.totalBilled - totalPaid);
      await Vendor.findByIdAndUpdate(row._id, { totalBilled: row.totalBilled, totalPaid, remaining });
    }
    console.log("Updated vendor totals from ledger + payments");
  }

  // --- Migrate legacy vendors without projectId to first project ---
  const migrated = await Vendor.updateMany(
    { $or: [{ projectId: { $exists: false } }, { projectId: null }] },
    { $set: { projectId: project1Id } }
  );
  if (migrated.modifiedCount > 0) console.log(`Migrated ${migrated.modifiedCount} vendors with projectId`);

  // --- Non-consumable categories ---
  const existingCategories = await NonConsumableCategory.countDocuments();
  if (existingCategories === 0) {
    await NonConsumableCategory.insertMany([
      { name: "Tools" },
      { name: "Scaffolding" },
      { name: "Shuttering" },
      { name: "Safety Gear" },
      { name: "Machinery" },
      { name: "Other" },
    ]);
    console.log("Seeded 6 non-consumable categories");
  }

  // --- Non-consumable items and ledger (optional sample) ---
  const existingNonConsumable = await NonConsumableItem.countDocuments();
  if (existingNonConsumable === 0) {
    const nc1 = await NonConsumableItem.create({
      name: "Concrete Mixer",
      category: "Machinery",
      unit: "piece",
      totalQuantity: 5,
      companyStore: 2,
      inUse: 3,
      underRepair: 0,
      lost: 0,
    });
    const nc2 = await NonConsumableItem.create({
      name: "Scaffolding Set",
      category: "Scaffolding",
      unit: "piece",
      totalQuantity: 20,
      companyStore: 5,
      inUse: 14,
      underRepair: 1,
      lost: 0,
    });
    const nc3 = await NonConsumableItem.create({
      name: "Safety Helmets",
      category: "Safety Gear",
      unit: "piece",
      totalQuantity: 100,
      companyStore: 30,
      inUse: 65,
      underRepair: 0,
      lost: 5,
    });
    const adminUser = await User.findOne({ role: "admin" }).lean();
    const createdBy = adminUser?._id ?? project1Id;
    await NonConsumableLedgerEntry.insertMany([
      { itemId: nc1._id, date: "2025-11-01", eventType: "Purchase", quantity: 5, totalCost: 600000, createdBy },
      { itemId: nc1._id, date: "2025-12-10", eventType: "AssignToProject", quantity: 3, projectTo: project1Id, createdBy },
      { itemId: nc2._id, date: "2025-10-15", eventType: "Purchase", quantity: 20, totalCost: 170000, createdBy },
      { itemId: nc2._id, date: "2026-01-05", eventType: "Repair", quantity: 1, totalCost: 2500, projectFrom: project1Id, createdBy },
    ]);
    console.log("Seeded 3 non-consumable items with ledger entries");
  }

  // --- Contractors (project-scoped) ---
  const contractorsP1 = await Contractor.find({ projectId: project1Id }).lean();
  const contractorsP2 = await Contractor.find({ projectId: project2Id }).lean();
  let contractor1Id: mongoose.Types.ObjectId;
  let contractor2Id: mongoose.Types.ObjectId;
  let contractor3Id: mongoose.Types.ObjectId;

  if (contractorsP1.length === 0) {
    const created = await Contractor.insertMany([
      { projectId: project1Id, name: "M/s Raj Construction", phone: "+92 98765 11111", description: "Civil work subcontractor" },
      { projectId: project1Id, name: "Steel Fixers Ltd", phone: "+92 98765 22222", description: "Rebar and steel fixing" },
      { projectId: project1Id, name: "Shuttering Experts", phone: "+92 98765 33333", description: "Formwork and shuttering" },
    ]);
    contractor1Id = created[0]._id;
    contractor2Id = created[1]._id;
    contractor3Id = created[2]._id;
    console.log("Seeded 3 contractors for project 1");
  } else {
    contractor1Id = contractorsP1[0]._id as mongoose.Types.ObjectId;
    contractor2Id = contractorsP1[1]._id as mongoose.Types.ObjectId;
    contractor3Id = contractorsP1[2]._id as mongoose.Types.ObjectId;
  }

  if (contractorsP2.length === 0) {
    await Contractor.insertMany([
      { projectId: project2Id, name: "Green Valley Builders", phone: "+92 98765 44444", description: "General construction" },
      { projectId: project2Id, name: "Residency Masons", phone: "+92 98765 55555", description: "Brickwork and plastering" },
    ]);
    console.log("Seeded 2 contractors for project 2");
  }

  // --- Contractor entries (project 1: Feb 2026) ---
  const existingEntries = await ContractorEntry.countDocuments();
  if (existingEntries === 0) {
    await ContractorEntry.insertMany([
      { contractorId: contractor1Id, projectId: project1Id, date: "2026-02-01", amount: 250000, remarks: "Foundation work - Phase 1" },
      { contractorId: contractor1Id, projectId: project1Id, date: "2026-02-15", amount: 180000, remarks: "Column casting" },
      { contractorId: contractor2Id, projectId: project1Id, date: "2026-02-10", amount: 320000, remarks: "Steel supply and fixing" },
      { contractorId: contractor3Id, projectId: project1Id, date: "2026-01-25", amount: 150000, remarks: "Shuttering for slab" },
    ]);
    console.log("Seeded 4 contractor entries");
  }

  // --- Contractor payments (project 1) ---
  const existingPayments = await ContractorPayment.countDocuments();
  if (existingPayments === 0) {
    await ContractorPayment.insertMany([
      { contractorId: contractor1Id, date: "2026-02-20", amount: 200000, paymentMethod: "Bank", referenceId: "CHQ-8001" },
      { contractorId: contractor2Id, date: "2026-02-22", amount: 150000, paymentMethod: "Online", referenceId: "NEFT-2001" },
    ]);
    console.log("Seeded 2 contractor payments");
  }

  // --- Expenses (project-scoped) ---
  const existingExpenses = await Expense.countDocuments();
  if (existingExpenses === 0) {
    await Expense.insertMany([
      { projectId: project1Id, date: "2026-01-10", description: "Site office electricity bill", category: "Utilities", paymentMode: "Online", amount: 12500 },
      { projectId: project1Id, date: "2026-01-12", description: "Transportation of materials", category: "Transport", paymentMode: "Cash", amount: 8500 },
      { projectId: project1Id, date: "2026-01-20", description: "Temporary fencing", category: "Site Setup", paymentMode: "Cash", amount: 15000 },
      { projectId: project1Id, date: "2026-02-01", description: "Water supply connection", category: "Utilities", paymentMode: "Online", amount: 5000 },
      { projectId: project2Id, date: "2026-01-15", description: "Safety inspection fees", category: "Compliance", paymentMode: "Bank", amount: 25000 },
    ]);
    console.log("Seeded 5 expenses");
  }

  // --- Users (skip if already exist). These match the demo accounts on the login page (password: password123). ---
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) {
    console.log("Users already exist, skipping user seed");
    await mongoose.disconnect();
    process.exit(0);
    return;
  }

  await User.insertMany([
    { name: "Super Admin", email: "superadmin@erp.com", passwordHash: hash, role: "super_admin" },
    { name: "Company Admin", email: "admin@erp.com", passwordHash: hash, role: "admin" },
    {
      name: "Site Manager",
      email: "site.mgr@erp.com",
      passwordHash: hash,
      role: "site_manager",
      assignedProjectId: project1Id.toString(),
      assignedProjectName: firstProjectName,
    },
  ]);
  console.log("Seeded 3 users (password: password123)");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
