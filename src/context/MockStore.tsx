import React, { createContext, useContext, useState, useCallback } from "react";
import type { Employee } from "@/lib/mock-data";
import {
  BankAccount,
  BankTransaction,
  AuditLog,
  User,
  bankAccounts as initialBankAccounts,
  bankTransactions as initialBankTransactions,
  auditLogs as initialAuditLogs,
  users as initialUsers,
} from "@/lib/mock-data";

interface MockStoreState {
  /** Employees come from API (useEmployees); mock list is empty. */
  employees: Employee[];
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  /** Machinery is now from API (useMachines); no longer in MockStore. */
  auditLogs: AuditLog[];
  users: User[];
  /** Current logged-in user id (prototype: for role-based UI e.g. Site Manager sees only assigned project) */
  currentUserId: string;
}

const initialState: MockStoreState = {
  employees: [],
  bankAccounts: initialBankAccounts,
  bankTransactions: initialBankTransactions,
  auditLogs: initialAuditLogs,
  users: initialUsers,
  currentUserId: "U002", // Admin by default; use U003 to test Site Manager (single project)
};

interface MockStoreActions {
  addBankAccount: (a: Omit<BankAccount, "id">) => void;
  addBankTransaction: (t: Omit<BankTransaction, "id">) => void;
  addAuditLog: (log: Omit<AuditLog, "id">) => void;
  setCurrentUserId: (userId: string) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
}

const genId = (prefix: string) => `${prefix}${Date.now().toString(36).slice(-6)}`;

const MockStoreContext = createContext<{ state: MockStoreState; actions: MockStoreActions } | null>(null);

export function MockStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MockStoreState>(initialState);

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

  const addAuditLog = useCallback((log: Omit<AuditLog, "id">) => {
    setState((prev) => ({
      ...prev,
      auditLogs: [{ ...log, id: genId("AL") }, ...prev.auditLogs],
    }));
  }, []);

  const setCurrentUserId = useCallback((userId: string) => {
    setState((prev) => ({ ...prev, currentUserId: userId }));
  }, []);

  const updateUser = useCallback((id: string, data: Partial<User>) => {
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
    }));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== id),
    }));
  }, []);

  const actions: MockStoreActions = {
    addBankAccount,
    addBankTransaction,
    addAuditLog,
    setCurrentUserId,
    updateUser,
    deleteUser,
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
