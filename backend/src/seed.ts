import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { faker } from "./lib/faker.js";
import type { ProjectStatus } from "./models/Project.js";
import type { BankTransactionMode, BankTransactionType } from "./models/BankTransaction.js";
import type { NonConsumableEventType } from "./models/NonConsumableLedgerEntry.js";
import { AuditLog } from "./models/AuditLog.js";
import { User } from "./models/User.js";
import { Project } from "./models/Project.js";
import { Vendor } from "./models/Vendor.js";
import { ConsumableItem } from "./models/ConsumableItem.js";
import { ItemLedgerEntry } from "./models/ItemLedgerEntry.js";
import { StockConsumptionEntry } from "./models/StockConsumptionEntry.js";
import { VendorPayment } from "./models/VendorPayment.js";
import { Contractor } from "./models/Contractor.js";
import { ContractorEntry } from "./models/ContractorEntry.js";
import { ContractorPayment } from "./models/ContractorPayment.js";
import { ContractorPaymentAllocation } from "./models/ContractorPaymentAllocation.js";
import { Employee } from "./models/Employee.js";
import { EmployeeAttendance } from "./models/EmployeeAttendance.js";
import { EmployeePayment } from "./models/EmployeePayment.js";
import { Machine } from "./models/Machine.js";
import { MachineLedgerEntry } from "./models/MachineLedgerEntry.js";
import { MachinePayment } from "./models/MachinePayment.js";
import { MachinePaymentAllocation } from "./models/MachinePaymentAllocation.js";
import { NonConsumableCategory } from "./models/NonConsumableCategory.js";
import { NonConsumableItem } from "./models/NonConsumableItem.js";
import { NonConsumableLedgerEntry } from "./models/NonConsumableLedgerEntry.js";
import { Expense } from "./models/Expense.js";
import { BankAccount } from "./models/BankAccount.js";
import { BankTransaction } from "./models/BankTransaction.js";
import { ProjectBalanceAdjustment } from "./models/ProjectBalanceAdjustment.js";
import { rebuildContractorPaymentAllocations } from "./services/contractorPaymentAllocationService.js";
import { rebuildMachinePaymentAllocations } from "./services/machinePaymentAllocationService.js";
import { computePayableForMonth } from "./services/employeeLedgerService.js";
import { computeProjectSpentAndLiabilities } from "./services/projectSummaryService.js";
import { getFifoAllocationForVendorsBulk } from "./services/fifoAllocation.js";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/builderp";
const SEED_PASSWORD = "password123";
const DAY_MS = 24 * 60 * 60 * 1000;

type ObjId = mongoose.Types.ObjectId;
type PaymentMethod = "Cash" | "Bank" | "Online";

interface ConsumableCatalogItem {
  name: string;
  unit: string;
  minUnitPrice: number;
  maxUnitPrice: number;
  minQty: number;
  maxQty: number;
}

interface NonConsumableCatalogItem {
  name: string;
  category: string;
  unit: string;
  minPurchaseQty: number;
  maxPurchaseQty: number;
  minUnitCost: number;
  maxUnitCost: number;
}

interface ProjectDocLike {
  _id: ObjId;
  name: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
}

const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "Bank", "Online"];

const PK_CITY_AREAS = [
  "DHA Lahore",
  "Bahria Town Karachi",
  "Gulberg Lahore",
  "Blue Area Islamabad",
  "Johar Town Lahore",
  "Clifton Karachi",
  "PWD Islamabad",
  "Scheme 33 Karachi",
  "Canal Road Faisalabad",
  "Model Town Multan",
];

const PROJECT_NAME_PREFIXES = [
  "Al-Noor",
  "Ravi",
  "Indus",
  "Margalla",
  "Himalaya",
  "Kohistan",
  "Nishat",
  "Shaheen",
  "Mehran",
  "Pakland",
];

const PROJECT_TYPES = [
  "Business Center",
  "Residency",
  "Heights",
  "Trade Tower",
  "Square",
  "Enclave",
  "Industrial Park",
  "Corporate Hub",
];

const VENDOR_PREFIXES = [
  "Al-Hamd",
  "Rehman",
  "Mehran",
  "Pak Build",
  "Sadiq",
  "Madina",
  "Faizan",
  "K2",
  "Bismillah",
  "Punjab",
  "Sindh",
  "Karakoram",
];

const VENDOR_SUFFIXES = [
  "Traders",
  "Suppliers",
  "Steels",
  "Cement Depot",
  "Hardware House",
  "Materials Co.",
  "Builders Mart",
  "Industrial Works",
];

const CONTRACTOR_PREFIXES = [
  "M/s Rehman",
  "M/s Al-Madina",
  "M/s Pakline",
  "M/s New City",
  "M/s Crescent",
  "M/s Green View",
  "M/s Skyline",
  "M/s Falcon",
];

const CONTRACTOR_SUFFIXES = [
  "Contractors",
  "Builders",
  "Engineering Works",
  "Construction Co.",
  "Civil Solutions",
  "Infrastructure Team",
];

const EMPLOYEE_FIRST_NAMES = [
  "Ali",
  "Ahmed",
  "Usman",
  "Bilal",
  "Hamza",
  "Hassan",
  "Imran",
  "Sajid",
  "Asad",
  "Shahid",
  "Adeel",
  "Owais",
  "Yasir",
  "Farhan",
  "Naveed",
];

const EMPLOYEE_LAST_NAMES = [
  "Khan",
  "Ahmed",
  "Malik",
  "Qureshi",
  "Raza",
  "Butt",
  "Sheikh",
  "Ansari",
  "Bashir",
  "Chaudhry",
  "Iqbal",
];

const EMPLOYEE_ROLES = [
  "Site Engineer",
  "Foreman",
  "Mason",
  "Bar Bender",
  "Steel Fixer",
  "Electrician",
  "Plumber",
  "Painter",
  "Surveyor",
  "Safety Officer",
];

const EXPENSE_CATEGORIES = [
  "Utilities",
  "Transport",
  "Fuel",
  "Site Setup",
  "Compliance",
  "Maintenance",
  "Security",
  "Equipment Rental",
];

const EXPENSE_DESCRIPTIONS = [
  "Diesel refill for site generators",
  "Water tanker supply",
  "Temporary boundary fencing",
  "Concrete pump mobilization",
  "Safety inspection and permit fee",
  "Night security deployment",
  "Site office internet and communication",
  "Worker transport arrangement",
  "Debris removal and dump charges",
];

const MACHINE_NAMES = [
  "JCB 3DX Backhoe Loader",
  "Transit Mixer 5m3",
  "Tower Crane 8 Ton",
  "Concrete Vibrator Set",
  "Road Roller 12 Ton",
  "Mini Excavator 2.5T",
  "Diesel Generator 125kVA",
  "Boom Lift 14m",
];

const CONSUMABLE_CATALOG: ConsumableCatalogItem[] = [
  { name: "DG Cement (50kg)", unit: "bag", minUnitPrice: 1180, maxUnitPrice: 1420, minQty: 250, maxQty: 900 },
  { name: "Maple Leaf Cement (50kg)", unit: "bag", minUnitPrice: 1200, maxUnitPrice: 1460, minQty: 250, maxQty: 850 },
  { name: "Steel Rebar Grade-60 (10mm)", unit: "kg", minUnitPrice: 265, maxUnitPrice: 335, minQty: 1400, maxQty: 6200 },
  { name: "Steel Rebar Grade-60 (12mm)", unit: "kg", minUnitPrice: 275, maxUnitPrice: 350, minQty: 1400, maxQty: 6000 },
  { name: "Margalla Crush Aggregate", unit: "cft", minUnitPrice: 120, maxUnitPrice: 190, minQty: 650, maxQty: 2200 },
  { name: "Chenab River Sand", unit: "cft", minUnitPrice: 85, maxUnitPrice: 135, minQty: 700, maxQty: 2400 },
  { name: "Awwal Bricks", unit: "piece", minUnitPrice: 18, maxUnitPrice: 28, minQty: 8000, maxQty: 26000 },
  { name: "Block Masonry (6 inch)", unit: "piece", minUnitPrice: 70, maxUnitPrice: 110, minQty: 2500, maxQty: 9000 },
  { name: "Binding Wire", unit: "kg", minUnitPrice: 300, maxUnitPrice: 420, minQty: 350, maxQty: 1400 },
  { name: "Shuttering Ply Board", unit: "sheet", minUnitPrice: 2400, maxUnitPrice: 4100, minQty: 80, maxQty: 320 },
];

const NON_CONSUMABLE_CATEGORIES = [
  "Tools",
  "Scaffolding",
  "Shuttering",
  "Safety Gear",
  "Machinery",
  "Electrical",
  "Survey",
  "Other",
];

const NON_CONSUMABLE_CATALOG: NonConsumableCatalogItem[] = [
  { name: "Concrete Mixer", category: "Machinery", unit: "piece", minPurchaseQty: 3, maxPurchaseQty: 8, minUnitCost: 220000, maxUnitCost: 380000 },
  { name: "Scaffolding Set", category: "Scaffolding", unit: "set", minPurchaseQty: 20, maxPurchaseQty: 70, minUnitCost: 9000, maxUnitCost: 22000 },
  { name: "Safety Helmets", category: "Safety Gear", unit: "piece", minPurchaseQty: 80, maxPurchaseQty: 250, minUnitCost: 1200, maxUnitCost: 2800 },
  { name: "Safety Harness", category: "Safety Gear", unit: "piece", minPurchaseQty: 25, maxPurchaseQty: 90, minUnitCost: 3800, maxUnitCost: 8200 },
  { name: "Bar Bending Machine", category: "Machinery", unit: "piece", minPurchaseQty: 2, maxPurchaseQty: 6, minUnitCost: 320000, maxUnitCost: 560000 },
  { name: "Aluminium Ladder", category: "Tools", unit: "piece", minPurchaseQty: 12, maxPurchaseQty: 45, minUnitCost: 14000, maxUnitCost: 32000 },
  { name: "Shuttering Plate", category: "Shuttering", unit: "piece", minPurchaseQty: 150, maxPurchaseQty: 520, minUnitCost: 1800, maxUnitCost: 4200 },
  { name: "Vibrator Needle Set", category: "Tools", unit: "set", minPurchaseQty: 10, maxPurchaseQty: 40, minUnitCost: 9000, maxUnitCost: 22000 },
  { name: "Laser Level", category: "Survey", unit: "piece", minPurchaseQty: 6, maxPurchaseQty: 16, minUnitCost: 45000, maxUnitCost: 120000 },
  { name: "Distribution Board Panel", category: "Electrical", unit: "piece", minPurchaseQty: 8, maxPurchaseQty: 22, minUnitCost: 26000, maxUnitCost: 76000 },
];

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function randomDate(start: Date, end: Date): Date {
  const min = start.getTime();
  const max = Math.max(min, end.getTime());
  return new Date(faker.number.int({ min, max }));
}

function randomSortedDateStrings(count: number, start: Date, end: Date): string[] {
  const dates = Array.from({ length: count }, () => randomDate(start, end)).sort(
    (a, b) => a.getTime() - b.getTime()
  );
  return dates.map((d, idx) => toDateOnly(addDays(d, idx)));
}

function randInt(min: number, max: number): number {
  return faker.number.int({ min, max });
}

function money(min: number, max: number, step: number = 100): number {
  const safeMin = Math.max(0, Math.min(min, max));
  const safeMax = Math.max(min, max);
  if (safeMin === safeMax) return safeMin;
  const slots = Math.floor((safeMax - safeMin) / step);
  return safeMin + randInt(0, Math.max(0, slots)) * step;
}

function roundToStep(amount: number, step: number = 100): number {
  return Math.max(0, Math.round(amount / step) * step);
}

function pick<T>(arr: readonly T[]): T {
  return faker.helpers.arrayElement(arr as T[]);
}

function pickDistinctDays(daysInMonth: number, count: number): number[] {
  const allDays = Array.from({ length: daysInMonth }, (_, idx) => idx + 1);
  const chosen = faker.helpers.arrayElements(allDays, Math.min(count, allDays.length));
  return chosen.sort((a, b) => a - b);
}

function monthKeyLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function daysInMonth(month: string): number {
  const [year, mon] = month.split("-").map(Number);
  return new Date(year, mon, 0).getDate();
}

function randomDateInMonth(month: string, minDay: number, maxDay: number): string {
  const day = randInt(minDay, maxDay);
  return `${month}-${String(day).padStart(2, "0")}`;
}

function phonePk(): string {
  return `+92 3${faker.string.numeric(2)} ${faker.string.numeric(7)}`;
}

function assertIntegrity(condition: unknown, message: string): void {
  if (!condition) throw new Error(`Seed integrity failed: ${message}`);
}

function projectDateWindow(project: ProjectDocLike): { start: Date; end: Date } {
  const start = new Date(`${project.startDate || "2025-01-01"}T00:00:00.000Z`);
  const rawEnd = project.endDate
    ? new Date(`${project.endDate}T00:00:00.000Z`)
    : addDays(new Date(), 120);
  const capEnd = project.status === "completed" ? rawEnd : new Date();
  let end = capEnd;
  if (end.getTime() <= start.getTime()) {
    end = addDays(start, 120);
  }
  if (end.getTime() > Date.now()) {
    end = new Date();
  }
  return { start, end };
}

async function resetNonUserData(): Promise<void> {
  await Promise.all([
    AuditLog.deleteMany({}),
    ProjectBalanceAdjustment.deleteMany({}),
    BankTransaction.deleteMany({}),
    BankAccount.deleteMany({}),
    Expense.deleteMany({}),
    MachinePaymentAllocation.deleteMany({}),
    MachinePayment.deleteMany({}),
    MachineLedgerEntry.deleteMany({}),
    Machine.deleteMany({}),
    EmployeePayment.deleteMany({}),
    EmployeeAttendance.deleteMany({}),
    Employee.deleteMany({}),
    ContractorPaymentAllocation.deleteMany({}),
    ContractorPayment.deleteMany({}),
    ContractorEntry.deleteMany({}),
    Contractor.deleteMany({}),
    NonConsumableLedgerEntry.deleteMany({}),
    NonConsumableItem.deleteMany({}),
    NonConsumableCategory.deleteMany({}),
    VendorPayment.deleteMany({}),
    StockConsumptionEntry.deleteMany({}),
    ItemLedgerEntry.deleteMany({}),
    ConsumableItem.deleteMany({}),
    Vendor.deleteMany({}),
    Project.deleteMany({}),
  ]);
}

async function ensureUsers(siteProject: { _id: ObjId; name: string }): Promise<{ adminUserId: ObjId }> {
  const hash = await bcrypt.hash(SEED_PASSWORD, 10);

  const userSpecs = [
    {
      name: "Super Admin",
      email: "superadmin@erp.com",
      role: "super_admin" as const,
      assignedProjectId: undefined,
      assignedProjectName: undefined,
    },
    {
      name: "Company Admin",
      email: "admin@erp.com",
      role: "admin" as const,
      assignedProjectId: undefined,
      assignedProjectName: undefined,
    },
    {
      name: "Site Manager",
      email: "site.mgr@erp.com",
      role: "site_manager" as const,
      assignedProjectId: siteProject._id.toString(),
      assignedProjectName: siteProject.name,
    },
  ];

  await User.deleteMany({ email: { $nin: userSpecs.map((u) => u.email) } });
  for (const user of userSpecs) {
    await User.updateOne(
      { email: user.email },
      {
        $set: {
          name: user.name,
          role: user.role,
          passwordHash: hash,
          assignedProjectId: user.assignedProjectId,
          assignedProjectName: user.assignedProjectName,
        },
      },
      { upsert: true }
    );
  }

  const admin = await User.findOne({ email: "admin@erp.com" }).select("_id").lean();
  if (!admin) throw new Error("Admin user missing after upsert");
  return { adminUserId: admin._id };
}

async function createProjects(): Promise<ProjectDocLike[]> {
  const statuses: ProjectStatus[] = ["active", "active", "on_hold", "completed"];
  const baseNames = faker.helpers.arrayElements(PROJECT_NAME_PREFIXES, 4);
  const baseAreas = faker.helpers.arrayElements(PK_CITY_AREAS, 4);
  const baseTypes = faker.helpers.arrayElements(PROJECT_TYPES, 4);

  const payloads = statuses.map((status, idx) => {
    const start = randomDate(new Date("2024-01-15"), new Date("2025-07-30"));
    const end =
      status === "completed"
        ? randomDate(addDays(start, 240), new Date("2026-02-20"))
        : randomDate(addDays(start, 360), new Date("2027-12-15"));

    return {
      name: `${baseNames[idx]} ${baseTypes[idx]}`,
      description: `${baseTypes[idx]} development at ${baseAreas[idx]} with staged civil, MEP and finishing works.`,
      allocatedBudget: money(120_000_000, 380_000_000, 100_000),
      status,
      startDate: toDateOnly(start),
      endDate: toDateOnly(end),
      spent: 0,
      balance: 0,
    };
  });

  const docs = await Project.insertMany(payloads);
  return docs.map((d) => ({
    _id: d._id,
    name: d.name,
    startDate: d.startDate,
    endDate: d.endDate,
    status: d.status,
  }));
}

async function seedBanking(projects: ProjectDocLike[]): Promise<void> {
  const accounts = await BankAccount.insertMany([
    {
      name: "Meezan Bank - Operations",
      accountNumber: `PK${faker.string.numeric(22)}`,
      openingBalance: money(45_000_000, 65_000_000, 100_000),
      currentBalance: 0,
      totalInflow: 0,
      totalOutflow: 0,
    },
    {
      name: "HBL - Project Disbursement",
      accountNumber: `PK${faker.string.numeric(22)}`,
      openingBalance: money(38_000_000, 58_000_000, 100_000),
      currentBalance: 0,
      totalInflow: 0,
      totalOutflow: 0,
    },
  ]);

  const runningBalances = new Map<string, number>(
    accounts.map((a) => [a._id.toString(), a.openingBalance])
  );
  const accountNameMap = new Map(accounts.map((a) => [a._id.toString(), a.name]));

  const bankTxDocs: Array<{
    accountId: ObjId;
    date: string;
    type: BankTransactionType;
    amount: number;
    source: string;
    destination: string;
    projectId?: ObjId;
    mode: BankTransactionMode;
    referenceId?: string;
    remarks?: string;
  }> = [];

  for (const account of accounts) {
    const inflowDates = randomSortedDateStrings(
      randInt(2, 3),
      new Date("2025-01-15"),
      new Date("2026-02-20")
    );
    for (const date of inflowDates) {
      const amount = money(9_000_000, 20_000_000, 50_000);
      const key = account._id.toString();
      runningBalances.set(key, (runningBalances.get(key) ?? 0) + amount);
      bankTxDocs.push({
        accountId: account._id,
        date,
        type: "inflow",
        amount,
        source: pick(["Director Capital", "Client Advance", "Bridge Finance", "Partner Injection"]),
        destination: account.name,
        mode: pick(PAYMENT_METHODS),
        referenceId: `INF-${faker.string.alphanumeric(8).toUpperCase()}`,
        remarks: "Capital / receivable inflow",
      });
    }
  }

  for (const project of projects) {
    const { start, end } = projectDateWindow(project);
    const outflowDates = randomSortedDateStrings(randInt(3, 4), addDays(start, 20), end);
    for (const date of outflowDates) {
      const accountChoices = accounts
        .map((a) => ({
          accountId: a._id,
          balance: runningBalances.get(a._id.toString()) ?? 0,
        }))
        .sort((a, b) => b.balance - a.balance);
      const selected = accountChoices[0];
      if (!selected || selected.balance < 2_500_000) continue;
      const maxAffordable = Math.max(2_500_000, Math.min(11_000_000, selected.balance - 500_000));
      const amount = money(2_500_000, maxAffordable, 50_000);
      const key = selected.accountId.toString();
      runningBalances.set(key, (runningBalances.get(key) ?? 0) - amount);

      bankTxDocs.push({
        accountId: selected.accountId,
        date,
        type: "outflow",
        amount,
        source: accountNameMap.get(key) ?? "Bank Account",
        destination: `${project.name} - Site Fund Transfer`,
        projectId: project._id,
        mode: pick(PAYMENT_METHODS),
        referenceId: `OUT-${faker.string.alphanumeric(8).toUpperCase()}`,
        remarks: "Project cash flow disbursement",
      });
    }
  }

  await BankTransaction.insertMany(bankTxDocs);
}

async function seedVendorsAndConsumables(project: ProjectDocLike): Promise<void> {
  const { start, end } = projectDateWindow(project);
  const vendorCount = randInt(5, 7);
  const vendorNames = new Set<string>();
  while (vendorNames.size < vendorCount) {
    vendorNames.add(`${pick(VENDOR_PREFIXES)} ${pick(VENDOR_SUFFIXES)}`);
  }

  const vendorDocs = await Vendor.insertMany(
    [...vendorNames].map((name) => ({
      projectId: project._id,
      name,
      phone: phonePk(),
      description: pick([
        "Structural and civil material supply",
        "Bulk supply for concrete and masonry",
        "Project-based daily dispatch support",
        "Specialized supply for steel and formwork",
      ]),
      totalBilled: 0,
      totalPaid: 0,
      remaining: 0,
    }))
  );

  const selectedCatalog = faker.helpers.arrayElements(CONSUMABLE_CATALOG, randInt(5, 7));
  const itemDocs = await ConsumableItem.insertMany(
    selectedCatalog.map((item) => ({
      projectId: project._id,
      name: item.name,
      unit: item.unit,
      currentStock: 0,
      totalPurchased: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalPending: 0,
    }))
  );

  const itemLedgerDocs: Array<{
    projectId: ObjId;
    itemId: ObjId;
    vendorId: ObjId;
    date: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    paidAmount: number;
    remaining: number;
    biltyNumber?: string;
    vehicleNumber?: string;
    paymentMethod: PaymentMethod;
    referenceId?: string;
    remarks?: string;
  }> = [];

  const itemConfigById = new Map<string, ConsumableCatalogItem>();
  selectedCatalog.forEach((cfg, idx) => itemConfigById.set(itemDocs[idx]._id.toString(), cfg));

  for (const item of itemDocs) {
    const cfg = itemConfigById.get(item._id.toString());
    if (!cfg) continue;
    const entryCount = randInt(2, 3);
    const ledgerDates = randomSortedDateStrings(entryCount, addDays(start, 5), addDays(end, -20));

    for (const date of ledgerDates) {
      const quantity = money(cfg.minQty, cfg.maxQty, 1);
      const unitPrice = money(cfg.minUnitPrice, cfg.maxUnitPrice, 1);
      const totalPrice = quantity * unitPrice;
      const upfrontPercent = randInt(25, 100);
      const paidAmount = roundToStep((totalPrice * upfrontPercent) / 100, 100);
      const cappedPaid = Math.min(totalPrice, paidAmount);
      const remaining = totalPrice - cappedPaid;

      itemLedgerDocs.push({
        projectId: project._id,
        itemId: item._id,
        vendorId: pick(vendorDocs)._id,
        date,
        quantity,
        unitPrice,
        totalPrice,
        paidAmount: cappedPaid,
        remaining,
        biltyNumber: `BLT-${faker.string.alphanumeric(6).toUpperCase()}`,
        vehicleNumber: `LE${faker.string.numeric(2)}-${faker.string.numeric(4)}`,
        paymentMethod: pick(PAYMENT_METHODS),
        referenceId: `INV-${faker.string.alphanumeric(7).toUpperCase()}`,
        remarks: pick([
          "Routine site supply as per indent",
          "Emergency batch delivery for slab cycle",
          "Dispatch against weekly procurement plan",
          "Stage-wise supply for active fronts",
        ]),
      });
    }
  }

  await ItemLedgerEntry.insertMany(itemLedgerDocs);

  const vendorPaymentDocs: Array<{
    vendorId: ObjId;
    date: string;
    amount: number;
    paymentMethod: PaymentMethod;
    referenceId?: string;
    remarks?: string;
  }> = [];

  for (const vendor of vendorDocs) {
    const vendorLedgers = itemLedgerDocs.filter(
      (entry) => entry.vendorId.toString() === vendor._id.toString()
    );
    if (vendorLedgers.length === 0) continue;
    const totalRemaining = vendorLedgers.reduce((sum, row) => sum + row.remaining, 0);
    if (totalRemaining <= 0) continue;
    if (!faker.datatype.boolean({ probability: 0.9 })) continue;

    const targetPay = roundToStep(
      (totalRemaining * randInt(35, 92)) / 100,
      500
    );
    let amountLeft = Math.min(totalRemaining, Math.max(5_000, targetPay));
    const paymentCount = Math.min(randInt(1, 2), Math.max(1, Math.ceil(amountLeft / 200_000)));

    const latestLedgerDate = vendorLedgers
      .map((l) => l.date)
      .sort((a, b) => b.localeCompare(a))[0];
    const paymentDates = randomSortedDateStrings(
      paymentCount,
      addDays(new Date(`${latestLedgerDate}T00:00:00.000Z`), 3),
      end
    );

    for (let i = 0; i < paymentCount; i++) {
      const isLast = i === paymentCount - 1;
      let amount = isLast
        ? amountLeft
        : roundToStep(
            Math.min(amountLeft, (amountLeft * randInt(35, 70)) / 100),
            500
          );
      amount = Math.max(1_000, Math.min(amount, amountLeft));
      amountLeft -= amount;

      vendorPaymentDocs.push({
        vendorId: vendor._id,
        date: paymentDates[i],
        amount,
        paymentMethod: pick(PAYMENT_METHODS),
        referenceId: `VP-${faker.string.alphanumeric(8).toUpperCase()}`,
        remarks: pick([
          "Part payment against running balance",
          "Bank transfer against approved bill",
          "Clearing old dues as per reconciliation",
        ]),
      });
    }
  }

  if (vendorPaymentDocs.length > 0) {
    await VendorPayment.insertMany(vendorPaymentDocs);
  }

  const stockByItem = new Map<string, number>();
  for (const row of itemLedgerDocs) {
    const key = row.itemId.toString();
    stockByItem.set(key, (stockByItem.get(key) ?? 0) + row.quantity);
  }
  const itemIdMap = new Map(itemDocs.map((i) => [i._id.toString(), i._id]));

  const consumptionEntryCount = randInt(4, 7);
  const consumptionDates = randomSortedDateStrings(
    consumptionEntryCount,
    addDays(start, 20),
    end
  );
  const consumptionDocs: Array<{
    projectId: ObjId;
    date: string;
    remarks?: string;
    items: Array<{ itemId: ObjId; quantityUsed: number }>;
  }> = [];

  for (const date of consumptionDates) {
    const eligible = [...stockByItem.entries()].filter(([, qty]) => qty > 0);
    if (eligible.length === 0) break;
    const pickCount = randInt(1, Math.min(3, eligible.length));
    const selected = faker.helpers.arrayElements(eligible, pickCount);
    const lines: Array<{ itemId: ObjId; quantityUsed: number }> = [];
    for (const [itemId, available] of selected) {
      const maxUse = Math.max(1, Math.floor(available * 0.22));
      const quantityUsed = randInt(1, maxUse);
      const itemObjectId = itemIdMap.get(itemId);
      if (!itemObjectId) continue;
      lines.push({ itemId: itemObjectId, quantityUsed });
      stockByItem.set(itemId, available - quantityUsed);
    }
    if (lines.length === 0) continue;
    consumptionDocs.push({
      projectId: project._id,
      date,
      remarks: pick([
        "RCC slab and beam pouring",
        "Block work and plaster support",
        "Site daily execution consumption",
        "Concrete and finishing cycle usage",
      ]),
      items: lines,
    });
  }

  if (consumptionDocs.length > 0) {
    await StockConsumptionEntry.insertMany(consumptionDocs);
  }

  await syncVendorTotalsForProject(project._id);
  await syncConsumableTotalsForProject(project._id);
}

async function seedContractors(project: ProjectDocLike): Promise<void> {
  const { start, end } = projectDateWindow(project);
  const contractorCount = randInt(5, 7);
  const contractorNames = new Set<string>();
  while (contractorNames.size < contractorCount) {
    contractorNames.add(`${pick(CONTRACTOR_PREFIXES)} ${pick(CONTRACTOR_SUFFIXES)}`);
  }

  const contractors = await Contractor.insertMany(
    [...contractorNames].map((name) => ({
      projectId: project._id,
      name,
      phone: phonePk(),
      description: pick([
        "Civil and structural labor package",
        "Specialized shuttering and formwork team",
        "Steel fixing and reinforcement crew",
        "Masonry and finishing subcontractor",
      ]),
    }))
  );

  const entryDocs: Array<{
    contractorId: ObjId;
    projectId: ObjId;
    date: string;
    amount: number;
    remarks?: string;
  }> = [];

  for (const contractor of contractors) {
    const entryCount = randInt(1, 2);
    const dates = randomSortedDateStrings(entryCount, addDays(start, 10), end);
    for (const date of dates) {
      entryDocs.push({
        contractorId: contractor._id,
        projectId: project._id,
        date,
        amount: money(180_000, 920_000, 1_000),
        remarks: pick([
          "Billing as per executed work quantity",
          "Running bill against progress milestone",
          "Labor and execution charge entry",
          "Measurement-based contractor claim",
        ]),
      });
    }
  }

  await ContractorEntry.insertMany(entryDocs);

  const payments: Array<{
    contractorId: ObjId;
    date: string;
    amount: number;
    paymentMethod: PaymentMethod;
    referenceId?: string;
  }> = [];

  for (const contractor of contractors) {
    const contractorEntries = entryDocs.filter(
      (entry) => entry.contractorId.toString() === contractor._id.toString()
    );
    const totalAmount = contractorEntries.reduce((sum, entry) => sum + entry.amount, 0);
    if (totalAmount <= 0) continue;
    if (!faker.datatype.boolean({ probability: 0.85 })) continue;

    const targetPaid = roundToStep((totalAmount * randInt(40, 90)) / 100, 1_000);
    let amountLeft = Math.min(totalAmount, targetPaid);
    if (amountLeft <= 0) continue;
    const paymentCount = randInt(1, 2);
    const latestDate = contractorEntries
      .map((entry) => entry.date)
      .sort((a, b) => b.localeCompare(a))[0];
    const paymentDates = randomSortedDateStrings(
      paymentCount,
      addDays(new Date(`${latestDate}T00:00:00.000Z`), 2),
      end
    );

    for (let i = 0; i < paymentCount; i++) {
      const isLast = i === paymentCount - 1;
      let amount = isLast
        ? amountLeft
        : roundToStep(Math.min(amountLeft, (amountLeft * randInt(35, 70)) / 100), 1_000);
      amount = Math.max(1_000, Math.min(amount, amountLeft));
      amountLeft -= amount;
      payments.push({
        contractorId: contractor._id,
        date: paymentDates[i],
        amount,
        paymentMethod: pick(PAYMENT_METHODS),
        referenceId: `CP-${faker.string.alphanumeric(8).toUpperCase()}`,
      });
    }
  }

  if (payments.length > 0) {
    await ContractorPayment.insertMany(payments);
  }

  await Promise.all(contractors.map((c) => rebuildContractorPaymentAllocations(c._id.toString())));
}

async function seedMachines(project: ProjectDocLike): Promise<void> {
  const { start, end } = projectDateWindow(project);
  const machineCount = randInt(3, 5);
  const machineNames = faker.helpers.arrayElements(MACHINE_NAMES, machineCount);

  const machines = await Machine.insertMany(
    machineNames.map((baseName, idx) => ({
      name: `${baseName} - ${project.name.split(" ")[0]}-${idx + 1}`,
      ownership: faker.datatype.boolean({ probability: 0.55 })
        ? ("Company Owned" as const)
        : ("Rented" as const),
      hourlyRate: money(2_500, 8_500, 50),
      projectId: project._id,
    }))
  );

  const ledgerDocs: Array<{
    machineId: ObjId;
    projectId: ObjId;
    date: string;
    hoursWorked: number;
    usedBy?: string;
    totalCost: number;
    remarks?: string;
  }> = [];

  for (const machine of machines) {
    const entryCount = randInt(2, 4);
    const dates = randomSortedDateStrings(entryCount, addDays(start, 12), end);
    for (const date of dates) {
      const hoursWorked = Number((randInt(4, 12) + randInt(0, 1) * 0.5).toFixed(1));
      const totalCost = roundToStep(hoursWorked * machine.hourlyRate, 1);
      ledgerDocs.push({
        machineId: machine._id,
        projectId: project._id,
        date,
        hoursWorked,
        usedBy: pick(["Earthwork Team", "Concrete Team", "Steel Team", "MEP Team"]),
        totalCost,
        remarks: pick([
          "Daily machinery utilization log",
          "Machine hours against execution target",
          "Shift usage captured for costing",
        ]),
      });
    }
  }

  await MachineLedgerEntry.insertMany(ledgerDocs);

  const paymentDocs: Array<{
    machineId: ObjId;
    date: string;
    amount: number;
    paymentMethod?: PaymentMethod;
    referenceId?: string;
  }> = [];

  for (const machine of machines) {
    const machineEntries = ledgerDocs.filter(
      (row) => row.machineId.toString() === machine._id.toString()
    );
    const totalCost = machineEntries.reduce((sum, row) => sum + row.totalCost, 0);
    if (totalCost <= 0) continue;
    if (!faker.datatype.boolean({ probability: 0.82 })) continue;

    const targetPaid = roundToStep((totalCost * randInt(35, 92)) / 100, 1_000);
    let amountLeft = Math.min(totalCost, targetPaid);
    if (amountLeft <= 0) continue;
    const paymentCount = randInt(1, 2);
    const latestDate = machineEntries
      .map((row) => row.date)
      .sort((a, b) => b.localeCompare(a))[0];
    const paymentDates = randomSortedDateStrings(
      paymentCount,
      addDays(new Date(`${latestDate}T00:00:00.000Z`), 2),
      end
    );

    for (let i = 0; i < paymentCount; i++) {
      const isLast = i === paymentCount - 1;
      let amount = isLast
        ? amountLeft
        : roundToStep(Math.min(amountLeft, (amountLeft * randInt(35, 70)) / 100), 1_000);
      amount = Math.max(1_000, Math.min(amount, amountLeft));
      amountLeft -= amount;
      paymentDocs.push({
        machineId: machine._id,
        date: paymentDates[i],
        amount,
        paymentMethod: pick(PAYMENT_METHODS),
        referenceId: `MP-${faker.string.alphanumeric(8).toUpperCase()}`,
      });
    }
  }

  if (paymentDocs.length > 0) {
    await MachinePayment.insertMany(paymentDocs);
  }

  await Promise.all(machines.map((m) => rebuildMachinePaymentAllocations(m._id.toString())));
}

async function seedEmployees(project: ProjectDocLike): Promise<void> {
  const employeeCount = randInt(5, 8);
  const month = monthKeyLocal(new Date());
  const monthDays = daysInMonth(month);

  const employeePayloads = Array.from({ length: employeeCount }, () => {
    const first = pick(EMPLOYEE_FIRST_NAMES);
    const last = pick(EMPLOYEE_LAST_NAMES);
    const type = faker.datatype.boolean({ probability: 0.45 })
      ? ("Fixed" as const)
      : ("Daily" as const);
    return {
      projectId: project._id,
      name: `${first} ${last}`,
      role: pick(EMPLOYEE_ROLES),
      type,
      monthlySalary: type === "Fixed" ? money(48_000, 220_000, 500) : undefined,
      dailyRate: type === "Daily" ? money(1_900, 6_200, 50) : undefined,
      phone: phonePk(),
    };
  });

  const employees = await Employee.insertMany(employeePayloads);

  const attendanceDocs = employees.map((employee) => {
    if (employee.type === "Fixed") {
      const unpaidLeaveDays = pickDistinctDays(monthDays, randInt(0, 2));
      const usedDays = new Set(unpaidLeaveDays);
      const paidLeavePool = Array.from({ length: monthDays }, (_, i) => i + 1).filter(
        (d) => !usedDays.has(d)
      );
      const paidLeaveDays = faker.helpers.arrayElements(paidLeavePool, randInt(0, 2)).sort(
        (a, b) => a - b
      );
      paidLeaveDays.forEach((d) => usedDays.add(d));
      const absentPool = Array.from({ length: monthDays }, (_, i) => i + 1).filter(
        (d) => !usedDays.has(d)
      );
      const absentDays = faker.helpers.arrayElements(absentPool, randInt(0, 2)).sort((a, b) => a - b);

      return {
        employeeId: employee._id,
        month,
        fixedEntries: [
          ...unpaidLeaveDays.map((day) => ({ day, status: "unpaid_leave" })),
          ...paidLeaveDays.map((day) => ({ day, status: "paid_leave" })),
          ...absentDays.map((day) => ({ day, status: "absent" })),
        ],
        dailyEntries: [] as Array<{
          day: number;
          hoursWorked: number;
          overtimeHours: number;
          status: string;
          notes?: string;
        }>,
      };
    }

    const workedDays = pickDistinctDays(monthDays, randInt(18, Math.min(26, monthDays)));
    return {
      employeeId: employee._id,
      month,
      fixedEntries: [] as Array<{ day: number; status: string }>,
      dailyEntries: workedDays.map((day) => ({
        day,
        hoursWorked: randInt(6, 8),
        overtimeHours: randInt(0, 2),
        status: "present",
        notes: faker.datatype.boolean({ probability: 0.25 }) ? "Overtime as per site demand" : undefined,
      })),
    };
  });

  await EmployeeAttendance.insertMany(attendanceDocs);

  const paymentDocs: Array<{
    employeeId: ObjId;
    month: string;
    date: string;
    amount: number;
    type: "Advance" | "Salary" | "Wage";
    paymentMethod: PaymentMethod;
    remarks?: string;
  }> = [];

  for (const employee of employees) {
    const payable = await computePayableForMonth(employee._id.toString(), month);
    if (payable <= 0) continue;
    const targetPaid = Math.min(payable, roundToStep((payable * randInt(55, 96)) / 100, 100));
    if (targetPaid <= 0) continue;

    const settlementType = employee.type === "Fixed" ? "Salary" : "Wage";
    const createAdvance = targetPaid > 15_000 && faker.datatype.boolean({ probability: 0.7 });

    if (createAdvance) {
      const advanceAmount = Math.min(
        targetPaid - 500,
        roundToStep((targetPaid * randInt(20, 40)) / 100, 100)
      );
      if (advanceAmount > 0) {
        paymentDocs.push({
          employeeId: employee._id,
          month,
          date: randomDateInMonth(month, 7, Math.min(16, monthDays)),
          amount: advanceAmount,
          type: "Advance",
          paymentMethod: pick(PAYMENT_METHODS),
          remarks: "Advance salary / wage against ongoing month",
        });
      }
      paymentDocs.push({
        employeeId: employee._id,
        month,
        date: randomDateInMonth(month, Math.min(22, monthDays), monthDays),
        amount: targetPaid - Math.max(0, advanceAmount),
        type: settlementType,
        paymentMethod: pick(PAYMENT_METHODS),
        remarks: "Month-end settlement",
      });
    } else {
      paymentDocs.push({
        employeeId: employee._id,
        month,
        date: randomDateInMonth(month, Math.min(20, monthDays), monthDays),
        amount: targetPaid,
        type: settlementType,
        paymentMethod: pick(PAYMENT_METHODS),
        remarks: "Single settlement entry",
      });
    }
  }

  if (paymentDocs.length > 0) {
    await EmployeePayment.insertMany(paymentDocs);
  }
}

async function seedExpenses(project: ProjectDocLike): Promise<void> {
  const { start, end } = projectDateWindow(project);
  const expenseCount = randInt(5, 8);
  const dates = randomSortedDateStrings(expenseCount, addDays(start, 14), end);
  const docs = dates.map((date) => ({
    projectId: project._id,
    date,
    description: pick(EXPENSE_DESCRIPTIONS),
    category: pick(EXPENSE_CATEGORIES),
    paymentMode: pick(PAYMENT_METHODS),
    amount: money(12_000, 280_000, 500),
  }));
  await Expense.insertMany(docs);
}

function computeNonConsumableBalances(
  entries: Array<{
    eventType: NonConsumableEventType;
    quantity: number;
    projectTo?: ObjId;
    projectFrom?: ObjId;
  }>
): {
  companyStore: number;
  inUseByProject: Map<string, number>;
  underRepair: number;
  lost: number;
} {
  let companyStore = 0;
  const inUseByProject = new Map<string, number>();
  let underRepair = 0;
  let lost = 0;

  for (const entry of entries) {
    const qty = entry.quantity;
    const projectTo = entry.projectTo?.toString();
    const projectFrom = entry.projectFrom?.toString();

    switch (entry.eventType) {
      case "Purchase":
        companyStore += qty;
        break;
      case "AssignToProject":
        if (!projectTo) break;
        companyStore -= qty;
        inUseByProject.set(projectTo, (inUseByProject.get(projectTo) ?? 0) + qty);
        break;
      case "ReturnToCompany":
        if (!projectFrom) break;
        inUseByProject.set(projectFrom, Math.max(0, (inUseByProject.get(projectFrom) ?? 0) - qty));
        companyStore += qty;
        break;
      case "Repair":
        if (!projectFrom) break;
        inUseByProject.set(projectFrom, Math.max(0, (inUseByProject.get(projectFrom) ?? 0) - qty));
        underRepair += qty;
        break;
      case "ReturnFromRepair":
        underRepair = Math.max(0, underRepair - qty);
        companyStore += qty;
        break;
      case "MarkLost":
        if (!projectFrom) break;
        inUseByProject.set(projectFrom, Math.max(0, (inUseByProject.get(projectFrom) ?? 0) - qty));
        lost += qty;
        break;
    }
  }

  return { companyStore, inUseByProject, underRepair, lost };
}

async function seedNonConsumables(projects: ProjectDocLike[], createdBy: ObjId): Promise<void> {
  await NonConsumableCategory.insertMany(NON_CONSUMABLE_CATEGORIES.map((name) => ({ name })));

  const selectedItems = faker.helpers.arrayElements(NON_CONSUMABLE_CATALOG, randInt(8, 10));
  for (const itemDef of selectedItems) {
    const item = await NonConsumableItem.create({
      name: itemDef.name,
      category: itemDef.category,
      unit: itemDef.unit,
      totalQuantity: 0,
      companyStore: 0,
      inUse: 0,
      underRepair: 0,
      lost: 0,
    });

    const entries: Array<{
      itemId: ObjId;
      date: string;
      eventType: NonConsumableEventType;
      quantity: number;
      totalCost?: number;
      projectTo?: ObjId;
      projectFrom?: ObjId;
      remarks?: string;
      createdBy: ObjId;
    }> = [];

    let cursor = randomDate(new Date("2025-01-15"), new Date("2025-05-20"));
    const advanceCursor = (minDays: number, maxDays: number): string => {
      cursor = addDays(cursor, randInt(minDays, maxDays));
      return toDateOnly(cursor);
    };

    const purchaseQty = randInt(itemDef.minPurchaseQty, itemDef.maxPurchaseQty);
    const unitCost = money(itemDef.minUnitCost, itemDef.maxUnitCost, 100);
    entries.push({
      itemId: item._id,
      date: advanceCursor(2, 8),
      eventType: "Purchase",
      quantity: purchaseQty,
      totalCost: purchaseQty * unitCost,
      remarks: "Initial company asset procurement",
      createdBy,
    });

    let companyStore = purchaseQty;
    const inUseByProject = new Map<string, number>();
    let underRepair = 0;

    const assignOps = randInt(1, 3);
    for (let i = 0; i < assignOps; i++) {
      if (companyStore <= 0) break;
      const qty = randInt(1, Math.max(1, Math.floor(companyStore * 0.6)));
      const project = pick(projects);
      entries.push({
        itemId: item._id,
        date: advanceCursor(4, 20),
        eventType: "AssignToProject",
        quantity: qty,
        projectTo: project._id,
        remarks: `Issued to ${project.name}`,
        createdBy,
      });
      companyStore -= qty;
      const key = project._id.toString();
      inUseByProject.set(key, (inUseByProject.get(key) ?? 0) + qty);
    }

    const projectIdsWithUse = [...inUseByProject.entries()].filter(([, q]) => q > 0);
    if (projectIdsWithUse.length > 0 && faker.datatype.boolean({ probability: 0.65 })) {
      const [projectId, qtyInUse] = pick(projectIdsWithUse);
      const qty = randInt(1, Math.max(1, Math.floor(qtyInUse * 0.45)));
      entries.push({
        itemId: item._id,
        date: advanceCursor(4, 20),
        eventType: "ReturnToCompany",
        quantity: qty,
        projectFrom: new mongoose.Types.ObjectId(projectId),
        remarks: "Returned after completion of activity",
        createdBy,
      });
      inUseByProject.set(projectId, qtyInUse - qty);
      companyStore += qty;
    }

    const usePoolForRepair = [...inUseByProject.entries()].filter(([, q]) => q > 0);
    if (usePoolForRepair.length > 0 && faker.datatype.boolean({ probability: 0.6 })) {
      const [projectId, qtyInUse] = pick(usePoolForRepair);
      const qty = randInt(1, Math.max(1, Math.floor(qtyInUse * 0.3)));
      entries.push({
        itemId: item._id,
        date: advanceCursor(5, 22),
        eventType: "Repair",
        quantity: qty,
        totalCost: qty * money(800, 14_000, 50),
        projectFrom: new mongoose.Types.ObjectId(projectId),
        remarks: "Repair/maintenance expense",
        createdBy,
      });
      inUseByProject.set(projectId, qtyInUse - qty);
      underRepair += qty;
    }

    if (underRepair > 0 && faker.datatype.boolean({ probability: 0.8 })) {
      const qty = randInt(1, underRepair);
      entries.push({
        itemId: item._id,
        date: advanceCursor(7, 25),
        eventType: "ReturnFromRepair",
        quantity: qty,
        remarks: "Asset returned from workshop",
        createdBy,
      });
      underRepair -= qty;
      companyStore += qty;
    }

    const usePoolForLoss = [...inUseByProject.entries()].filter(([, q]) => q > 0);
    if (usePoolForLoss.length > 0 && faker.datatype.boolean({ probability: 0.35 })) {
      const [projectId, qtyInUse] = pick(usePoolForLoss);
      const qty = randInt(1, Math.max(1, Math.floor(qtyInUse * 0.2)));
      entries.push({
        itemId: item._id,
        date: advanceCursor(5, 18),
        eventType: "MarkLost",
        quantity: qty,
        projectFrom: new mongoose.Types.ObjectId(projectId),
        remarks: "Loss entry verified by site team",
        createdBy,
      });
      inUseByProject.set(projectId, qtyInUse - qty);
    }

    await NonConsumableLedgerEntry.insertMany(entries);

    const balances = computeNonConsumableBalances(entries);
    const inUse = [...balances.inUseByProject.values()].reduce((sum, q) => sum + q, 0);
    const totalQuantity =
      Math.max(0, balances.companyStore) + inUse + balances.underRepair + balances.lost;

    await NonConsumableItem.findByIdAndUpdate(item._id, {
      totalQuantity,
      companyStore: Math.max(0, balances.companyStore),
      inUse,
      underRepair: balances.underRepair,
      lost: balances.lost,
    });
  }
}

async function syncVendorTotalsForProject(projectId: ObjId): Promise<void> {
  const vendors = await Vendor.find({ projectId }).select("_id").lean();
  const vendorIds = vendors.map((v) => v._id);
  const [ledgers, payments] = await Promise.all([
    ItemLedgerEntry.find({ projectId, vendorId: { $in: vendorIds } }).lean(),
    VendorPayment.find({ vendorId: { $in: vendorIds } }).lean(),
  ]);

  const ledgerTotals = new Map<string, { billed: number; paidFromLedger: number }>();
  for (const row of ledgers) {
    const key = row.vendorId.toString();
    const existing = ledgerTotals.get(key) ?? { billed: 0, paidFromLedger: 0 };
    existing.billed += row.totalPrice;
    existing.paidFromLedger += row.paidAmount;
    ledgerTotals.set(key, existing);
  }
  const paymentTotals = new Map<string, number>();
  for (const payment of payments) {
    const key = payment.vendorId.toString();
    paymentTotals.set(key, (paymentTotals.get(key) ?? 0) + payment.amount);
  }

  await Promise.all(
    vendorIds.map(async (vendorId) => {
      const key = vendorId.toString();
      const billed = ledgerTotals.get(key)?.billed ?? 0;
      const paid = (ledgerTotals.get(key)?.paidFromLedger ?? 0) + (paymentTotals.get(key) ?? 0);
      const remaining = Math.max(0, billed - paid);
      await Vendor.findByIdAndUpdate(vendorId, {
        totalBilled: billed,
        totalPaid: paid,
        remaining,
      });
    })
  );
}

async function syncConsumableTotalsForProject(projectId: ObjId): Promise<void> {
  const items = await ConsumableItem.find({ projectId }).select("_id").lean();
  const itemIds = items.map((i) => i._id);
  const [ledgers, consumptions] = await Promise.all([
    ItemLedgerEntry.find({ projectId, itemId: { $in: itemIds } }).lean(),
    StockConsumptionEntry.find({ projectId }).lean(),
  ]);

  const vendorIds = [...new Set(ledgers.map((l) => l.vendorId.toString()))];
  const fifoByVendor = await getFifoAllocationForVendorsBulk(vendorIds);

  const byItem = new Map<string, { purchased: number; amount: number; paid: number; pending: number }>();
  for (const item of items) {
    byItem.set(item._id.toString(), { purchased: 0, amount: 0, paid: 0, pending: 0 });
  }
  for (const row of ledgers) {
    const key = row.itemId.toString();
    const agg = byItem.get(key);
    if (!agg) continue;
    agg.purchased += row.quantity;
    agg.amount += row.totalPrice;
    const allocation = fifoByVendor.get(row.vendorId.toString())?.get(row._id.toString());
    agg.paid += allocation?.allocatedPaid ?? row.paidAmount;
    agg.pending += allocation?.allocatedRemaining ?? row.remaining;
  }

  const consumedByItem = new Map<string, number>();
  for (const entry of consumptions) {
    for (const line of entry.items) {
      const key = line.itemId.toString();
      consumedByItem.set(key, (consumedByItem.get(key) ?? 0) + line.quantityUsed);
    }
  }

  await Promise.all(
    itemIds.map(async (itemId) => {
      const key = itemId.toString();
      const agg = byItem.get(key) ?? { purchased: 0, amount: 0, paid: 0, pending: 0 };
      const consumed = consumedByItem.get(key) ?? 0;
      await ConsumableItem.findByIdAndUpdate(itemId, {
        totalPurchased: agg.purchased,
        totalAmount: agg.amount,
        totalPaid: agg.paid,
        totalPending: agg.pending,
        currentStock: Math.max(0, agg.purchased - consumed),
      });
    })
  );
}

async function syncBankAndProjectBalances(projectIds: ObjId[]): Promise<void> {
  const accounts = await BankAccount.find().lean();
  const accountIds = accounts.map((a) => a._id);
  const transactions = await BankTransaction.find({ accountId: { $in: accountIds } }).lean();

  const byAccount = new Map<string, { inflow: number; outflow: number }>();
  for (const account of accounts) {
    byAccount.set(account._id.toString(), { inflow: 0, outflow: 0 });
  }
  for (const tx of transactions) {
    const key = tx.accountId.toString();
    const agg = byAccount.get(key);
    if (!agg) continue;
    if (tx.type === "inflow") agg.inflow += tx.amount;
    else agg.outflow += tx.amount;
  }

  await Promise.all(
    accounts.map(async (account) => {
      const agg = byAccount.get(account._id.toString()) ?? { inflow: 0, outflow: 0 };
      const currentBalance = account.openingBalance + agg.inflow - agg.outflow;
      await BankAccount.findByIdAndUpdate(account._id, {
        totalInflow: agg.inflow,
        totalOutflow: agg.outflow,
        currentBalance,
      });
    })
  );

  const [projectOutflows, adjustments] = await Promise.all([
    BankTransaction.aggregate<{ _id: ObjId; total: number }>([
      { $match: { type: "outflow", projectId: { $exists: true, $ne: null } } },
      { $group: { _id: "$projectId", total: { $sum: "$amount" } } },
    ]),
    ProjectBalanceAdjustment.aggregate<{ _id: ObjId; total: number }>([
      { $group: { _id: "$projectId", total: { $sum: "$amount" } } },
    ]),
  ]);

  const outflowMap = new Map(projectOutflows.map((r) => [r._id.toString(), r.total]));
  const adjustmentMap = new Map(adjustments.map((r) => [r._id.toString(), r.total]));

  await Promise.all(
    projectIds.map(async (projectId) => {
      const balance =
        (outflowMap.get(projectId.toString()) ?? 0) + (adjustmentMap.get(projectId.toString()) ?? 0);
      await Project.findByIdAndUpdate(projectId, { balance: Math.max(0, balance) });
    })
  );
}

async function syncProjectSpent(projectIds: ObjId[]): Promise<void> {
  for (const projectId of projectIds) {
    const summary = await computeProjectSpentAndLiabilities(projectId.toString());
    await Project.findByIdAndUpdate(projectId, { spent: Math.max(0, summary.spent) });
  }
}

async function verifySeedIntegrity(projects: ProjectDocLike[]): Promise<void> {
  const vendorRows = await Vendor.find().lean();
  for (const vendor of vendorRows) {
    const [ledgers, payments] = await Promise.all([
      ItemLedgerEntry.find({ vendorId: vendor._id }).lean(),
      VendorPayment.find({ vendorId: vendor._id }).lean(),
    ]);
    const billed = ledgers.reduce((sum, row) => sum + row.totalPrice, 0);
    const paid = ledgers.reduce((sum, row) => sum + row.paidAmount, 0) + payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, billed - paid);
    assertIntegrity(vendor.totalBilled === billed, `Vendor billed mismatch for ${vendor.name}`);
    assertIntegrity(vendor.totalPaid === paid, `Vendor paid mismatch for ${vendor.name}`);
    assertIntegrity(vendor.remaining === remaining, `Vendor remaining mismatch for ${vendor.name}`);
    if (vendor.totalBilled > 0) {
      assertIntegrity(ledgers.length > 0, `Vendor ${vendor.name} has totals without ledger entries`);
    }
  }

  const items = await NonConsumableItem.find().lean();
  for (const item of items) {
    const ledger = await NonConsumableLedgerEntry.find({ itemId: item._id })
      .sort({ date: 1, createdAt: 1 })
      .lean();
    const balances = computeNonConsumableBalances(
      ledger.map((row) => ({
        eventType: row.eventType,
        quantity: row.quantity,
        projectTo: row.projectTo,
        projectFrom: row.projectFrom,
      }))
    );
    const inUse = [...balances.inUseByProject.values()].reduce((sum, q) => sum + q, 0);
    const totalQuantity = Math.max(0, balances.companyStore) + inUse + balances.underRepair + balances.lost;
    assertIntegrity(ledger.length > 0, `Non-consumable ${item.name} has no ledger`);
    assertIntegrity(item.companyStore === Math.max(0, balances.companyStore), `CompanyStore mismatch for ${item.name}`);
    assertIntegrity(item.inUse === inUse, `InUse mismatch for ${item.name}`);
    assertIntegrity(item.underRepair === balances.underRepair, `UnderRepair mismatch for ${item.name}`);
    assertIntegrity(item.lost === balances.lost, `Lost mismatch for ${item.name}`);
    assertIntegrity(item.totalQuantity === totalQuantity, `TotalQuantity mismatch for ${item.name}`);
  }

  for (const project of projects) {
    const consumableCount = await ConsumableItem.countDocuments({ projectId: project._id });
    const itemLedgerCount = await ItemLedgerEntry.countDocuments({ projectId: project._id });
    const contractorEntryCount = await ContractorEntry.countDocuments({ projectId: project._id });
    const machineEntryCount = await MachineLedgerEntry.countDocuments({ projectId: project._id });
    assertIntegrity(consumableCount >= 5 && consumableCount <= 10, `Project ${project.name} must have 5-10 consumables`);
    assertIntegrity(itemLedgerCount >= 5, `Project ${project.name} should have at least 5 item ledger rows`);
    assertIntegrity(contractorEntryCount >= 5, `Project ${project.name} should have at least 5 contractor entries`);
    assertIntegrity(machineEntryCount >= 5, `Project ${project.name} should have at least 5 machine ledger entries`);

    const dbProject = await Project.findById(project._id).lean();
    const summary = await computeProjectSpentAndLiabilities(project._id.toString());
    assertIntegrity(
      Math.abs((dbProject?.spent ?? 0) - summary.spent) <= 0.5,
      `Project spent mismatch for ${project.name}`
    );
  }
}

async function seed(): Promise<void> {
  faker.seed(20260301);
  await mongoose.connect(MONGODB_URI);

  try {
    // Hard reset: wipe the whole database before creating fresh seed data.
    await mongoose.connection.db?.dropDatabase();
    await resetNonUserData();
    const projects = await createProjects();
    const { adminUserId } = await ensureUsers({ _id: projects[0]._id, name: projects[0].name });

    await seedBanking(projects);

    for (const project of projects) {
      await seedVendorsAndConsumables(project);
      await seedContractors(project);
      await seedEmployees(project);
      await seedMachines(project);
      await seedExpenses(project);
    }

    await seedNonConsumables(projects, adminUserId);
    await syncBankAndProjectBalances(projects.map((p) => p._id));
    await syncProjectSpent(projects.map((p) => p._id));
    await verifySeedIntegrity(projects);

    const counts = await Promise.all([
      Project.countDocuments(),
      Vendor.countDocuments(),
      ConsumableItem.countDocuments(),
      ItemLedgerEntry.countDocuments(),
      VendorPayment.countDocuments(),
      StockConsumptionEntry.countDocuments(),
      Contractor.countDocuments(),
      ContractorEntry.countDocuments(),
      ContractorPayment.countDocuments(),
      Employee.countDocuments(),
      EmployeeAttendance.countDocuments(),
      EmployeePayment.countDocuments(),
      Machine.countDocuments(),
      MachineLedgerEntry.countDocuments(),
      MachinePayment.countDocuments(),
      Expense.countDocuments(),
      NonConsumableItem.countDocuments(),
      NonConsumableLedgerEntry.countDocuments(),
      BankAccount.countDocuments(),
      BankTransaction.countDocuments(),
    ]);

    console.log("Seed completed with relationally-linked, ledger-backed data:");
    console.log({
      projects: counts[0],
      vendors: counts[1],
      consumableItems: counts[2],
      itemLedgerEntries: counts[3],
      vendorPayments: counts[4],
      stockConsumptions: counts[5],
      contractors: counts[6],
      contractorEntries: counts[7],
      contractorPayments: counts[8],
      employees: counts[9],
      attendanceSheets: counts[10],
      employeePayments: counts[11],
      machines: counts[12],
      machineLedgerEntries: counts[13],
      machinePayments: counts[14],
      expenses: counts[15],
      nonConsumableItems: counts[16],
      nonConsumableLedgerEntries: counts[17],
      bankAccounts: counts[18],
      bankTransactions: counts[19],
      users: 3,
      password: SEED_PASSWORD,
    });
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
