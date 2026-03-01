// Mock data for Construction ERP prototype
// Projects are fetched from MongoDB via /api/projects
// Consumable items, item ledger, and stock consumption have been migrated to MongoDB — see /api/consumable-items, /api/stock-consumption
// Non-consumable inventory and ledger have been migrated to MongoDB — see /api/non-consumable-items, /api/non-consumable-categories

export interface Vendor {
  id: string;
  name: string;
  phone: string;
  description: string;
  totalBilled: number;
  totalPaid: number;
  remaining: number;
}

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
  role: string;
  type: "Fixed" | "Daily";
  project: string;
  monthlySalary?: number;
  dailyRate?: number;
  phone: string;
  totalPaid: number;
  totalDue: number;
}

export const employees: Employee[] = [
  { id: "E001", name: "Rajesh Kumar", role: "Foreman", type: "Fixed", project: "Skyline Tower", monthlySalary: 45000, phone: "+92 99887 76655", totalPaid: 270000, totalDue: 45000 },
  { id: "E002", name: "Suresh Patel", role: "Site Engineer", type: "Fixed", project: "Green Valley Residency", monthlySalary: 38000, phone: "+92 99887 76656", totalPaid: 228000, totalDue: 0 },
  { id: "E003", name: "Amit Singh", role: "Mason", type: "Daily", project: "Skyline Tower", dailyRate: 800, phone: "+92 99887 76657", totalPaid: 52000, totalDue: 4800 },
  { id: "E004", name: "Vikram Yadav", role: "Helper", type: "Daily", project: "Metro Bridge Expansion", dailyRate: 700, phone: "+92 99887 76658", totalPaid: 35000, totalDue: 2100 },
  { id: "E005", name: "Priya Sharma", role: "Admin Staff", type: "Fixed", project: "Skyline Tower", monthlySalary: 55000, phone: "+92 99887 76659", totalPaid: 330000, totalDue: 55000 },
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
