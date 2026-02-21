// Mock data for Construction ERP prototype

export interface Project {
  id: string;
  name: string;
  description: string;
  allocatedBudget: number;
  status: "Active" | "On Hold" | "Completed";
  startDate: string;
  endDate: string;
  spent: number;
}

export const projects: Project[] = [
  { id: "P001", name: "Skyline Tower", description: "32-floor commercial tower", allocatedBudget: 45000000, status: "Active", startDate: "2025-01-15", endDate: "2027-06-30", spent: 12500000 },
  { id: "P002", name: "Green Valley Residency", description: "Residential complex with 120 units", allocatedBudget: 28000000, status: "Active", startDate: "2025-03-01", endDate: "2026-12-31", spent: 8200000 },
  { id: "P003", name: "Metro Bridge Expansion", description: "Highway bridge expansion project", allocatedBudget: 15000000, status: "On Hold", startDate: "2025-06-01", endDate: "2026-08-15", spent: 3100000 },
  { id: "P004", name: "Civic Center Renovation", description: "Government civic center renovation", allocatedBudget: 8500000, status: "Completed", startDate: "2024-04-01", endDate: "2025-09-30", spent: 8200000 },
];

export interface ConsumableItem {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  totalPurchased: number;
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
}

export const consumableItems: ConsumableItem[] = [
  { id: "CI001", name: "Cement", unit: "bag", currentStock: 450, totalPurchased: 2000, totalAmount: 700000, totalPaid: 620000, totalPending: 80000 },
  { id: "CI002", name: "Steel Bars (10mm)", unit: "kg", currentStock: 3200, totalPurchased: 15000, totalAmount: 1200000, totalPaid: 1100000, totalPending: 100000 },
  { id: "CI003", name: "Sand", unit: "cft", currentStock: 800, totalPurchased: 5000, totalAmount: 250000, totalPaid: 250000, totalPending: 0 },
  { id: "CI004", name: "Bricks", unit: "piece", currentStock: 12000, totalPurchased: 50000, totalAmount: 400000, totalPaid: 350000, totalPending: 50000 },
  { id: "CI005", name: "Aggregate (20mm)", unit: "cft", currentStock: 600, totalPurchased: 3000, totalAmount: 180000, totalPaid: 180000, totalPending: 0 },
];

export interface LedgerEntry {
  id: string;
  date: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paidAmount: number;
  remaining: number;
  vendor: string;
  biltyNumber?: string;
  vehicleNumber?: string;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

export const cementLedger: LedgerEntry[] = [
  { id: "L001", date: "2025-12-01", quantity: 500, unitPrice: 350, totalPrice: 175000, paidAmount: 175000, remaining: 0, vendor: "ABC Traders", biltyNumber: "BL-1234", vehicleNumber: "KA-01-AB-1234", paymentMethod: "Bank", referenceId: "CHQ-5678", remarks: "Bulk order" },
  { id: "L002", date: "2025-12-15", quantity: 300, unitPrice: 355, totalPrice: 106500, paidAmount: 80000, remaining: 26500, vendor: "XYZ Suppliers", vehicleNumber: "KA-02-CD-5678", paymentMethod: "Cash" },
  { id: "L003", date: "2026-01-05", quantity: 700, unitPrice: 345, totalPrice: 241500, paidAmount: 200000, remaining: 41500, vendor: "ABC Traders", biltyNumber: "BL-1290", paymentMethod: "Bank", referenceId: "CHQ-5690" },
  { id: "L004", date: "2026-01-20", quantity: 500, unitPrice: 350, totalPrice: 175000, paidAmount: 165000, remaining: 10000, vendor: "Metro Materials", paymentMethod: "Online", referenceId: "TXN-78901", remarks: "Urgent delivery" },
];

export interface NonConsumableItem {
  id: string;
  name: string;
  category: string;
  totalQuantity: number;
  companyStore: number;
  inUse: number;
  underRepair: number;
  lost: number;
}

export const nonConsumableItems: NonConsumableItem[] = [
  { id: "NC001", name: "Concrete Mixer", category: "Machinery", totalQuantity: 5, companyStore: 2, inUse: 3, underRepair: 0, lost: 0 },
  { id: "NC002", name: "Scaffolding Set", category: "Scaffolding", totalQuantity: 20, companyStore: 5, inUse: 14, underRepair: 1, lost: 0 },
  { id: "NC003", name: "Safety Helmets", category: "Safety Gear", totalQuantity: 100, companyStore: 30, inUse: 65, underRepair: 0, lost: 5 },
  { id: "NC004", name: "Drill Machine", category: "Tools", totalQuantity: 12, companyStore: 4, inUse: 7, underRepair: 1, lost: 0 },
  { id: "NC005", name: "Shuttering Plates", category: "Shuttering", totalQuantity: 50, companyStore: 10, inUse: 38, underRepair: 2, lost: 0 },
];

export interface Vendor {
  id: string;
  name: string;
  phone: string;
  description: string;
  totalBilled: number;
  totalPaid: number;
  remaining: number;
}

export const vendors: Vendor[] = [
  { id: "V001", name: "ABC Traders", phone: "+92 98765 43210", description: "Cement & building materials supplier", totalBilled: 416500, totalPaid: 375000, remaining: 41500 },
  { id: "V002", name: "XYZ Suppliers", phone: "+92 98765 43211", description: "Steel & iron supplies", totalBilled: 1200000, totalPaid: 1100000, remaining: 100000 },
  { id: "V003", name: "Metro Materials", phone: "+92 98765 43212", description: "General construction materials", totalBilled: 575000, totalPaid: 515000, remaining: 60000 },
  { id: "V004", name: "SafetyFirst Co.", phone: "+92 98765 43213", description: "Safety equipment", totalBilled: 180000, totalPaid: 180000, remaining: 0 },
];

export interface Contractor {
  id: string;
  name: string;
  phone: string;
  description: string;
  project: string;
}

export interface ContractorEntry {
  id: string;
  contractorId: string;
  date: string;
  amount: number;
  remarks: string;
}

export interface ContractorPayment {
  id: string;
  contractorId: string;
  date: string;
  amount: number;
  paymentMode: "Cash" | "Bank" | "Online";
  referenceId?: string;
}

export const contractors: Contractor[] = [
  { id: "CT001", name: "M/s Raj Construction", phone: "+92 98765 11111", description: "Civil work subcontractor", project: "Skyline Tower" },
  { id: "CT002", name: "Steel Fixers Ltd", phone: "+92 98765 22222", description: "Rebar and steel fixing", project: "Skyline Tower" },
  { id: "CT003", name: "Shuttering Experts", phone: "+92 98765 33333", description: "Formwork and shuttering", project: "Green Valley Residency" },
];

export const contractorEntries: ContractorEntry[] = [
  { id: "CE001", contractorId: "CT001", date: "2026-02-01", amount: 250000, remarks: "Foundation work - Phase 1" },
  { id: "CE002", contractorId: "CT001", date: "2026-02-15", amount: 180000, remarks: "Column casting" },
  { id: "CE003", contractorId: "CT002", date: "2026-02-10", amount: 320000, remarks: "Steel supply and fixing" },
  { id: "CE004", contractorId: "CT003", date: "2026-01-25", amount: 150000, remarks: "Shuttering for slab" },
];

export const contractorPayments: ContractorPayment[] = [
  { id: "CP001", contractorId: "CT001", date: "2026-02-20", amount: 200000, paymentMode: "Bank", referenceId: "CHQ-8001" },
  { id: "CP002", contractorId: "CT002", date: "2026-02-22", amount: 150000, paymentMode: "Online", referenceId: "NEFT-2001" },
];

export interface Employee {
  id: string;
  name: string;
  type: "Fixed" | "Daily";
  project: string;
  monthlySalary?: number;
  dailyRate?: number;
  phone: string;
  totalPaid: number;
  totalDue: number;
}

export const employees: Employee[] = [
  { id: "E001", name: "Rajesh Kumar", type: "Fixed", project: "Skyline Tower", monthlySalary: 45000, phone: "+92 99887 76655", totalPaid: 270000, totalDue: 45000 },
  { id: "E002", name: "Suresh Patel", type: "Fixed", project: "Green Valley Residency", monthlySalary: 38000, phone: "+92 99887 76656", totalPaid: 228000, totalDue: 0 },
  { id: "E003", name: "Amit Singh", type: "Daily", project: "Skyline Tower", dailyRate: 800, phone: "+92 99887 76657", totalPaid: 52000, totalDue: 4800 },
  { id: "E004", name: "Vikram Yadav", type: "Daily", project: "Metro Bridge Expansion", dailyRate: 700, phone: "+92 99887 76658", totalPaid: 35000, totalDue: 2100 },
  { id: "E005", name: "Priya Sharma", type: "Fixed", project: "Skyline Tower", monthlySalary: 55000, phone: "+92 99887 76659", totalPaid: 330000, totalDue: 55000 },
];

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  openingBalance: number;
  currentBalance: number;
  totalInflow: number;
  totalOutflow: number;
}

export const bankAccounts: BankAccount[] = [
  { id: "B001", bankName: "State Bank of India", accountNumber: "XXXX-XXXX-1234", openingBalance: 5000000, currentBalance: 8750000, totalInflow: 12000000, totalOutflow: 8250000 },
  { id: "B002", bankName: "HDFC Bank", accountNumber: "XXXX-XXXX-5678", openingBalance: 2000000, currentBalance: 3200000, totalInflow: 5000000, totalOutflow: 3800000 },
  { id: "B003", bankName: "ICICI Bank", accountNumber: "XXXX-XXXX-9012", openingBalance: 1000000, currentBalance: 850000, totalInflow: 2000000, totalOutflow: 2150000 },
];

export interface BankTransaction {
  id: string;
  date: string;
  type: "Inflow" | "Outflow";
  amount: number;
  source: string;
  destination: string;
  mode: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
}

export const bankTransactions: BankTransaction[] = [
  { id: "BT001", date: "2026-01-15", type: "Inflow", amount: 2000000, source: "Client Payment - Skyline", destination: "SBI Account", mode: "Bank", referenceId: "NEFT-123456", remarks: "Phase 2 payment" },
  { id: "BT002", date: "2026-01-18", type: "Outflow", amount: 500000, source: "SBI Account", destination: "ABC Traders", mode: "Bank", referenceId: "CHQ-7890" },
  { id: "BT003", date: "2026-01-20", type: "Outflow", amount: 180000, source: "HDFC Account", destination: "Salary Payment", mode: "Online", referenceId: "BATCH-SAL-01" },
  { id: "BT004", date: "2026-02-01", type: "Inflow", amount: 1500000, source: "Client Payment - Green Valley", destination: "HDFC Account", mode: "Bank", referenceId: "NEFT-234567" },
  { id: "BT005", date: "2026-02-05", type: "Outflow", amount: 75000, source: "Cash", destination: "Site Expenses", mode: "Cash", remarks: "Misc site expenses" },
];

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: string;
  paymentMode: "Cash" | "Bank" | "Online";
  amount: number;
  project: string;
}

export const expenses: Expense[] = [
  { id: "EX001", date: "2026-01-10", description: "Site office electricity bill", category: "Utilities", paymentMode: "Online", amount: 12500, project: "Skyline Tower" },
  { id: "EX002", date: "2026-01-12", description: "Transportation of materials", category: "Transport", paymentMode: "Cash", amount: 8500, project: "Skyline Tower" },
  { id: "EX003", date: "2026-01-15", description: "Safety inspection fees", category: "Compliance", paymentMode: "Bank", amount: 25000, project: "Green Valley Residency" },
  { id: "EX004", date: "2026-01-20", description: "Temporary fencing", category: "Site Setup", paymentMode: "Cash", amount: 15000, project: "Metro Bridge Expansion" },
  { id: "EX005", date: "2026-02-01", description: "Water supply connection", category: "Utilities", paymentMode: "Online", amount: 5000, project: "Skyline Tower" },
];

export interface Machine {
  id: string;
  name: string;
  ownership: "Company Owned" | "Rented";
  hourlyRate: number;
  totalHours: number;
  totalCost: number;
  totalPaid: number;
  totalPending: number;
  /** Project this machine is assigned to (optional; used for project-scoped views) */
  project?: string;
}

export const machines: Machine[] = [
  { id: "M001", name: "Tower Crane TC-200", ownership: "Rented", hourlyRate: 2500, totalHours: 480, totalCost: 1200000, totalPaid: 1000000, totalPending: 200000, project: "Skyline Tower" },
  { id: "M002", name: "Excavator CAT 320", ownership: "Company Owned", hourlyRate: 1800, totalHours: 320, totalCost: 576000, totalPaid: 576000, totalPending: 0, project: "Skyline Tower" },
  { id: "M003", name: "Concrete Pump", ownership: "Rented", hourlyRate: 3000, totalHours: 150, totalCost: 450000, totalPaid: 350000, totalPending: 100000, project: "Green Valley Residency" },
  { id: "M004", name: "JCB Backhoe", ownership: "Company Owned", hourlyRate: 1200, totalHours: 200, totalCost: 240000, totalPaid: 240000, totalPending: 0, project: "Metro Bridge Expansion" },
];

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: "Create" | "Edit" | "Delete";
  module: string;
  description: string;
  oldValue?: string;
  newValue?: string;
}

export const auditLogs: AuditLog[] = [
  { id: "AL001", timestamp: "2026-02-18 14:30:22", user: "admin@erp.com", role: "Admin", action: "Create", module: "Consumable Inventory", description: "Added 500 bags of Cement" },
  { id: "AL002", timestamp: "2026-02-18 13:15:10", user: "admin@erp.com", role: "Admin", action: "Edit", module: "Project", description: "Updated Skyline Tower budget", oldValue: "PKR 40,000,000", newValue: "PKR 45,000,000" },
  { id: "AL003", timestamp: "2026-02-17 16:45:33", user: "site.mgr@erp.com", role: "Site Manager", action: "Create", module: "Stock Consumption", description: "Consumed 50 bags Cement from Skyline Tower" },
  { id: "AL004", timestamp: "2026-02-17 11:20:05", user: "superadmin@erp.com", role: "Super Admin", action: "Delete", module: "Expense", description: "Deleted duplicate expense entry EX-099" },
  { id: "AL005", timestamp: "2026-02-16 09:00:18", user: "admin@erp.com", role: "Admin", action: "Create", module: "Employee", description: "Added new employee Vikram Yadav" },
  { id: "AL006", timestamp: "2026-02-15 17:30:42", user: "admin@erp.com", role: "Admin", action: "Edit", module: "Vendor", description: "Updated ABC Traders payment", oldValue: "Paid: PKR 300,000", newValue: "Paid: PKR 375,000" },
];

// Expense categories (searchable + one-click create)
export const expenseCategories: string[] = ["Utilities", "Transport", "Compliance", "Site Setup", "Materials", "Labour", "Misc"];

// Non-consumable asset ledger event types (SRS 3.2.2)
export type NonConsumableEventType =
  | "Purchase/Add Stock"
  | "Assign to Project"
  | "Return to Company"
  | "Transfer Project → Project"
  | "Repair / Maintenance"
  | "Mark Lost"
  | "Mark Damaged (Still usable)"
  | "Mark Damaged (Not usable)";

export interface NonConsumableLedgerEntry {
  id: string;
  itemId: string;
  date: string;
  eventType: NonConsumableEventType;
  quantity: number;
  unitPrice?: number;
  cost?: number;
  vendorName?: string;
  projectFrom?: string;
  projectTo?: string;
  remarks?: string;
  createdBy: string;
}

export const nonConsumableLedger: NonConsumableLedgerEntry[] = [
  { id: "NCL001", itemId: "NC001", date: "2025-11-01", eventType: "Purchase/Add Stock", quantity: 5, unitPrice: 120000, vendorName: "Heavy Equip Co", createdBy: "admin@erp.com" },
  { id: "NCL002", itemId: "NC001", date: "2025-12-10", eventType: "Assign to Project", quantity: 3, projectTo: "Skyline Tower", createdBy: "admin@erp.com" },
  { id: "NCL003", itemId: "NC002", date: "2025-10-15", eventType: "Purchase/Add Stock", quantity: 20, unitPrice: 8500, vendorName: "Scaffold Ltd", createdBy: "admin@erp.com" },
  { id: "NCL004", itemId: "NC002", date: "2026-01-05", eventType: "Repair / Maintenance", quantity: 1, cost: 2500, remarks: "Replaced parts", createdBy: "admin@erp.com" },
];

// Machine ledger entries (SRS 3.8)
export interface MachineLedgerEntry {
  id: string;
  machineId: string;
  date: string;
  hoursWorked: number;
  usedBy?: string;
  totalCost: number;
  paidAmount: number;
  remaining: number;
  remarks?: string;
}

export const machineLedgerEntries: MachineLedgerEntry[] = [
  { id: "ML001", machineId: "M001", date: "2026-01-10", hoursWorked: 40, usedBy: "Site A", totalCost: 100000, paidAmount: 100000, remaining: 0 },
  { id: "ML002", machineId: "M001", date: "2026-01-20", hoursWorked: 32, usedBy: "Site B", totalCost: 80000, paidAmount: 60000, remaining: 20000 },
  { id: "ML003", machineId: "M002", date: "2026-01-15", hoursWorked: 24, totalCost: 43200, paidAmount: 43200, remaining: 0 },
];

// Stock consumption entry (SRS 3.2.1 D)
export interface StockConsumptionEntry {
  id: string;
  date: string;
  projectId: string;
  projectName: string;
  remarks?: string;
  items: { itemId: string; itemName: string; unit: string; quantityUsed: number }[];
}

export const stockConsumptionEntries: StockConsumptionEntry[] = [
  { id: "SC001", date: "2026-01-12", projectId: "P001", projectName: "Skyline Tower", remarks: "Floor 5", items: [{ itemId: "CI001", itemName: "Cement", unit: "bag", quantityUsed: 50 }] },
];

// User (for User Management - Super Admin)
export type UserRole = "Super Admin" | "Admin" | "Site Manager";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedProjectId?: string;
  assignedProjectName?: string;
}

export const users: User[] = [
  { id: "U001", name: "Super Admin", email: "superadmin@erp.com", role: "Super Admin" },
  { id: "U002", name: "Company Admin", email: "admin@erp.com", role: "Admin" },
  { id: "U003", name: "Site Manager", email: "site.mgr@erp.com", role: "Site Manager", assignedProjectId: "P001", assignedProjectName: "Skyline Tower" },
];

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amount);
};

/** Compact form for KPIs: 85K, 45L (lakh), 2.5Cr (crore). Optional prefix e.g. "PKR ". */
export const formatCurrencyCompact = (
  amount: number,
  options?: { prefix?: string }
): string => {
  const prefix = options?.prefix ?? "PKR ";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  if (abs >= 1e7) return `${sign}${prefix}${(abs / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${sign}${prefix}${(abs / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${sign}${prefix}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${prefix}${Math.round(abs)}`;
};
