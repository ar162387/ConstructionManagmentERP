import React, { createContext, useContext, useState, useCallback } from "react";
import {
  Project,
  ConsumableItem,
  LedgerEntry,
  NonConsumableItem,
  NonConsumableLedgerEntry,
  Vendor,
  Contractor,
  ContractorEntry,
  ContractorPayment,
  Employee,
  BankAccount,
  BankTransaction,
  Expense,
  Machine,
  MachineLedgerEntry,
  AuditLog,
  StockConsumptionEntry,
  User,
  expenseCategories as initialExpenseCategories,
  projects as initialProjects,
  consumableItems as initialConsumableItems,
  cementLedger as initialCementLedger,
  nonConsumableItems as initialNonConsumableItems,
  nonConsumableLedger as initialNonConsumableLedger,
  vendors as initialVendors,
  contractors as initialContractors,
  contractorEntries as initialContractorEntries,
  contractorPayments as initialContractorPayments,
  employees as initialEmployees,
  bankAccounts as initialBankAccounts,
  bankTransactions as initialBankTransactions,
  expenses as initialExpenses,
  machines as initialMachines,
  machineLedgerEntries as initialMachineLedgerEntries,
  auditLogs as initialAuditLogs,
  stockConsumptionEntries as initialStockConsumptionEntries,
  users as initialUsers,
} from "@/lib/mock-data";

type LedgerEntryWithItemId = LedgerEntry & { itemId?: string };

interface MockStoreState {
  projects: Project[];
  consumableItems: ConsumableItem[];
  ledgerByItem: Record<string, LedgerEntryWithItemId[]>;
  nonConsumableItems: NonConsumableItem[];
  nonConsumableLedger: NonConsumableLedgerEntry[];
  vendors: Vendor[];
  contractors: Contractor[];
  contractorEntries: ContractorEntry[];
  contractorPayments: ContractorPayment[];
  employees: Employee[];
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  expenses: Expense[];
  expenseCategories: string[];
  machines: Machine[];
  machineLedgerEntries: MachineLedgerEntry[];
  auditLogs: AuditLog[];
  stockConsumptionEntries: StockConsumptionEntry[];
  users: User[];
  /** Current logged-in user id (prototype: for role-based UI e.g. Site Manager sees only assigned project) */
  currentUserId: string;
}

const defaultLedgerByItem: Record<string, LedgerEntryWithItemId[]> = {};
initialConsumableItems.forEach((item) => {
  defaultLedgerByItem[item.id] = item.id === "CI001"
    ? initialCementLedger.map((e) => ({ ...e, itemId: "CI001" }))
    : [];
});

const initialState: MockStoreState = {
  projects: initialProjects,
  consumableItems: initialConsumableItems,
  ledgerByItem: defaultLedgerByItem,
  nonConsumableItems: initialNonConsumableItems,
  nonConsumableLedger: initialNonConsumableLedger,
  vendors: initialVendors,
  contractors: initialContractors,
  contractorEntries: initialContractorEntries,
  contractorPayments: initialContractorPayments,
  employees: initialEmployees,
  bankAccounts: initialBankAccounts,
  bankTransactions: initialBankTransactions,
  expenses: initialExpenses,
  expenseCategories: [...initialExpenseCategories],
  machines: initialMachines,
  machineLedgerEntries: initialMachineLedgerEntries,
  auditLogs: initialAuditLogs,
  stockConsumptionEntries: initialStockConsumptionEntries,
  users: initialUsers,
  currentUserId: "U002", // Admin by default; use U003 to test Site Manager (single project)
};

interface MockStoreActions {
  addProject: (p: Omit<Project, "id">) => void;
  addConsumableItem: (item: Omit<ConsumableItem, "id">) => void;
  addLedgerEntry: (itemId: string, entry: Omit<LedgerEntry, "id">) => void;
  addNonConsumableItem: (item: Omit<NonConsumableItem, "id">) => void;
  addNonConsumableLedgerEntry: (entry: Omit<NonConsumableLedgerEntry, "id">) => void;
  addVendor: (v: Omit<Vendor, "id">) => void;
  addContractor: (c: Omit<Contractor, "id">) => void;
  addContractorEntry: (e: Omit<ContractorEntry, "id">) => void;
  addContractorPayment: (p: Omit<ContractorPayment, "id">) => void;
  addEmployee: (e: Omit<Employee, "id">) => void;
  addBankAccount: (a: Omit<BankAccount, "id">) => void;
  addBankTransaction: (t: Omit<BankTransaction, "id">) => void;
  addExpense: (e: Omit<Expense, "id">) => void;
  addExpenseCategory: (name: string) => void;
  addMachine: (m: Omit<Machine, "id">) => void;
  addMachineLedgerEntry: (e: Omit<MachineLedgerEntry, "id">) => void;
  addStockConsumption: (s: Omit<StockConsumptionEntry, "id">) => void;
  addAuditLog: (log: Omit<AuditLog, "id">) => void;
  getLedgerForItem: (itemId: string) => LedgerEntryWithItemId[];
}

const genId = (prefix: string) => `${prefix}${Date.now().toString(36).slice(-6)}`;

const MockStoreContext = createContext<{ state: MockStoreState; actions: MockStoreActions } | null>(null);

export function MockStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MockStoreState>(initialState);

  const addProject = useCallback((p: Omit<Project, "id">) => {
    setState((prev) => ({
      ...prev,
      projects: [...prev.projects, { ...p, id: genId("P") }],
    }));
  }, []);

  const addConsumableItem = useCallback((item: Omit<ConsumableItem, "id">) => {
    const id = genId("CI");
    setState((prev) => ({
      ...prev,
      consumableItems: [...prev.consumableItems, { ...item, id }],
      ledgerByItem: { ...prev.ledgerByItem, [id]: [] },
    }));
  }, []);

  const addLedgerEntry = useCallback((itemId: string, entry: Omit<LedgerEntry, "id">) => {
    const id = genId("L");
    setState((prev) => ({
      ...prev,
      ledgerByItem: {
        ...prev.ledgerByItem,
        [itemId]: [...(prev.ledgerByItem[itemId] || []), { ...entry, id, itemId }],
      },
    }));
  }, []);

  const addNonConsumableItem = useCallback((item: Omit<NonConsumableItem, "id">) => {
    setState((prev) => ({
      ...prev,
      nonConsumableItems: [...prev.nonConsumableItems, { ...item, id: genId("NC") }],
    }));
  }, []);

  const addNonConsumableLedgerEntry = useCallback((entry: Omit<NonConsumableLedgerEntry, "id">) => {
    setState((prev) => ({
      ...prev,
      nonConsumableLedger: [...prev.nonConsumableLedger, { ...entry, id: genId("NCL") }],
    }));
  }, []);

  const addVendor = useCallback((v: Omit<Vendor, "id">) => {
    setState((prev) => ({ ...prev, vendors: [...prev.vendors, { ...v, id: genId("V") }] }));
  }, []);

  const addContractor = useCallback((c: Omit<Contractor, "id">) => {
    setState((prev) => ({ ...prev, contractors: [...prev.contractors, { ...c, id: genId("CT") }] }));
  }, []);

  const addContractorEntry = useCallback((e: Omit<ContractorEntry, "id">) => {
    setState((prev) => ({
      ...prev,
      contractorEntries: [...prev.contractorEntries, { ...e, id: genId("CE") }],
    }));
  }, []);

  const addContractorPayment = useCallback((p: Omit<ContractorPayment, "id">) => {
    setState((prev) => ({
      ...prev,
      contractorPayments: [...prev.contractorPayments, { ...p, id: genId("CP") }],
    }));
  }, []);

  const addEmployee = useCallback((e: Omit<Employee, "id">) => {
    setState((prev) => ({ ...prev, employees: [...prev.employees, { ...e, id: genId("E") }] }));
  }, []);

  const addBankAccount = useCallback((a: Omit<BankAccount, "id">) => {
    setState((prev) => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, { ...a, id: genId("B") }],
    }));
  }, []);

  const addBankTransaction = useCallback((t: Omit<BankTransaction, "id">) => {
    setState((prev) => ({
      ...prev,
      bankTransactions: [...prev.bankTransactions, { ...t, id: genId("BT") }],
    }));
  }, []);

  const addExpense = useCallback((e: Omit<Expense, "id">) => {
    setState((prev) => ({ ...prev, expenses: [...prev.expenses, { ...e, id: genId("EX") }] }));
  }, []);

  const addExpenseCategory = useCallback((name: string) => {
    setState((prev) =>
      prev.expenseCategories.includes(name) ? prev : { ...prev, expenseCategories: [...prev.expenseCategories, name] }
    );
  }, []);

  const addMachine = useCallback((m: Omit<Machine, "id">) => {
    setState((prev) => ({ ...prev, machines: [...prev.machines, { ...m, id: genId("M") }] }));
  }, []);

  const addMachineLedgerEntry = useCallback((e: Omit<MachineLedgerEntry, "id">) => {
    setState((prev) => ({
      ...prev,
      machineLedgerEntries: [...prev.machineLedgerEntries, { ...e, id: genId("ML") }],
    }));
  }, []);

  const addStockConsumption = useCallback((s: Omit<StockConsumptionEntry, "id">) => {
    setState((prev) => ({
      ...prev,
      stockConsumptionEntries: [...prev.stockConsumptionEntries, { ...s, id: genId("SC") }],
    }));
  }, []);

  const addAuditLog = useCallback((log: Omit<AuditLog, "id">) => {
    setState((prev) => ({
      ...prev,
      auditLogs: [{ ...log, id: genId("AL") }, ...prev.auditLogs],
    }));
  }, []);

  const getLedgerForItem = useCallback(
    (itemId: string) => state.ledgerByItem[itemId] || [],
    [state.ledgerByItem]
  );

  const actions: MockStoreActions = {
    addProject,
    addConsumableItem,
    addLedgerEntry,
    addNonConsumableItem,
    addNonConsumableLedgerEntry,
    addVendor,
    addContractor,
    addContractorEntry,
    addContractorPayment,
    addEmployee,
    addBankAccount,
    addBankTransaction,
    addExpense,
    addExpenseCategory,
    addMachine,
    addMachineLedgerEntry,
    addStockConsumption,
    addAuditLog,
    getLedgerForItem,
  };

  return (
    <MockStoreContext.Provider value={{ state, actions }}>
      {children}
    </MockStoreContext.Provider>
  );
}

export function useMockStore() {
  const ctx = useContext(MockStoreContext);
  if (!ctx) throw new Error("useMockStore must be used within MockStoreProvider");
  return ctx;
}
