// User Roles
export type UserRole = 'super_admin' | 'admin' | 'site_manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  /** Project IDs this user can access. For site_manager, only these projects are visible. */
  assignedProjects?: string[];
  /** Admin only: whether user can edit records */
  canEdit?: boolean;
  /** Admin only: whether user can delete records */
  canDelete?: boolean;
}

// Bank & Accounts
export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  type: 'checking' | 'savings' | 'business';
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'inflow' | 'outflow';
  amount: number;
  description: string;
  category: string;
  paymentMode: 'cash' | 'bank_transfer' | 'cheque';
  projectId?: string;
  date: Date;
  createdBy: string;
}

// Projects
export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on_hold';
  budget: number;
  spent: number;
  startDate: Date;
  endDate?: Date;
  managerId: string;
  siteManagers?: { id: string; name: string; email: string; role: string }[];
}

// Units (for consumables; user can add custom units)
export interface Unit {
  id: string;
  name: string;
  symbol: string;
}

// Inventory - Consumable master list (company-level only)
export interface ConsumableItem {
  id: string;
  name: string;
  unitId: string;
  currentStock: number;
}

// Non-consumable inventory (quantity-based; company-level master list)
export interface NonConsumableItem {
  id: string;
  name: string;
  storeQty: number;
  damagedQty: number;
  lostQty: number;
  totalAssigned: number;
  assignments?: NonConsumableProjectAssignment[];
  createdAt?: string;
}

export interface NonConsumableProjectAssignment {
  projectId: string;
  project?: { id: string; name: string };
  quantity: number;
}

// Receiving entry (adds stock to store; company-level)
export interface ReceivingEntry {
  id: string;
  remarks: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  lineItems: ReceivingEntryLineItem[];
  totalValue?: number;
}

export interface ReceivingEntryLineItem {
  id: string;
  nonConsumableItemId: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
  nonConsumableItem?: { id: string; name: string };
}

// Non-consumable movement (immutable transaction)
export type NonConsumableMovementType =
  | 'assign_to_project'
  | 'return_to_store'
  | 'mark_lost'
  | 'mark_damaged'
  | 'repair_damaged'
  | 'mark_lost_from_damaged'
  | 'restore_from_lost'
  | 'restore_from_damaged'
  | 'reverse_repair'
  | 'restore_to_damaged';

export interface NonConsumableMovement {
  id: string;
  nonConsumableItemId: string;
  movementType: NonConsumableMovementType;
  quantity: number;
  projectId: string | null;
  cost: number | null;
  remarks: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  nonConsumableItem?: { id: string; name: string };
  project?: { id: string; name: string };
  undoneAt?: string | null;
  undoneBy?: { id: string; name: string } | null;
}

// Personnel
export interface Employee {
  id: string;
  projectId: string;
  name: string;
  role: string;
  payType: 'monthly' | 'weekly' | 'daily' | 'hourly';
  payRate: number;
  phone: string;
  joiningDate: Date;
  assets: string[];
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  period: string;
  basePay: number;
  advances: number;
  deductions: number;
  netPay: number;
  status: 'pending' | 'paid';
  paidDate?: Date;
}

// Vendors (company-scoped only; contractors are separate module)
export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  totalBilled?: number;
  totalPaid?: number;
  outstanding?: number;
}

// Vendor Invoice (stock addition - company-scoped)
export interface VendorInvoice {
  id: string;
  vendorId: string;
  vehicleNumber: string;
  biltyNumber: string;
  invoiceDate: Date;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  createdBy: string;
  createdAt: Date;
  invoiceNumber?: string;
}

export interface VendorInvoiceLineItem {
  id: string;
  invoiceId: string;
  consumableItemId: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export type PaymentMode = 'cash' | 'bank_transfer' | 'cheque';

export interface VendorInvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  date: Date;
  paymentMode: PaymentMode;
  reference?: string;
  createdBy: string;
}

// Contractors (project-scoped)
export interface Contractor {
  id: string;
  projectId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  createdAt?: string;
}

export interface ContractorBillingEntry {
  id: string;
  projectId: string;
  contractorId: string;
  amount: number;
  remarks: string | null;
  entryDate: string;
  createdBy: string | null;
  createdAt: string;
  contractor?: { id: string; name: string };
}

export interface ContractorPayment {
  id: string;
  contractorId: string;
  amount: number;
  paymentDate: string;
  paymentMode: string | null;
  reference: string | null;
  createdBy?: { id: string; name: string } | null;
  createdAt?: string;
}

// Stock Consumption (project-scoped)
export interface StockConsumptionEntry {
  id: string;
  projectId: string;
  remarks: string;
  createdBy: string;
  createdAt: Date;
}

export interface StockConsumptionLineItem {
  id: string;
  consumptionEntryId: string;
  consumableItemId: string;
  quantity: number;
}

// Audit
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'status_change';
  targetType?: string | null;
  targetId?: number | null;
  module: string;
  details: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  timestamp: Date;
}

// Dashboard Stats
export interface DashboardStats {
  totalBalance: number;
  totalProjects: number;
  activeProjects: number;
  totalExpenses: number;
  totalEmployees: number;
  pendingPayables: number;
}
