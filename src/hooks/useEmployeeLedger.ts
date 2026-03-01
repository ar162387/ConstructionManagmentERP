import { useState, useEffect, useCallback } from "react";
import {
  getEmployee,
  type ApiEmployee,
} from "@/services/employeesService";
import {
  getEmployeeLedger,
  getEmployeeLedgerSnapshot,
  getAttendance,
  putAttendance,
  type ApiEmployeeLedger,
  type ApiAttendance,
} from "@/services/employeeLedgerService";

const DEFAULT_LEDGER_PAGE_SIZE = 12;

export function useEmployeeLedger(
  employeeId: string | undefined,
  month: string,
  ledgerPage: number = 1,
  ledgerPageSize: number = DEFAULT_LEDGER_PAGE_SIZE
) {
  const [employee, setEmployee] = useState<ApiEmployee | null>(null);
  const [ledger, setLedger] = useState<ApiEmployeeLedger | null>(null);
  const [attendance, setAttendance] = useState<ApiAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchLedger = useCallback(async () => {
    if (!employeeId) return;
    setLedgerLoading(true);
    try {
      const data = await getEmployeeLedger(employeeId, {
        page: ledgerPage,
        pageSize: ledgerPageSize,
      });
      setLedger((prev) => ({ ...data, snapshot: prev?.snapshot }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ledger");
    } finally {
      setLedgerLoading(false);
    }
  }, [employeeId, ledgerPage, ledgerPageSize]);

  const refetchAttendance = useCallback(async () => {
    if (!employeeId) return;
    setAttendanceLoading(true);
    try {
      const data = await getAttendance(employeeId, month);
      setAttendance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance");
    } finally {
      setAttendanceLoading(false);
    }
  }, [employeeId, month]);

  const refetchEmployee = useCallback(async () => {
    if (!employeeId) return;
    try {
      const emp = await getEmployee(employeeId);
      setEmployee(emp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employee");
    }
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId) {
      setEmployee(null);
      setLedger(null);
      setAttendance(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getEmployee(employeeId)
      .then((emp) => {
        if (!cancelled) setEmployee(emp);
      })
      .catch((err) => {
        if (!cancelled) {
          setEmployee(null);
          setError(err instanceof Error ? err.message : "Failed to load employee");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId) return;
    refetchLedger();
  }, [employeeId, refetchLedger]);

  useEffect(() => {
    if (!employeeId || !month) return;
    let cancelled = false;
    getEmployeeLedgerSnapshot(employeeId, month)
      .then((data) => {
        if (cancelled) return;
        setLedger((prev) => (prev ? { ...prev, snapshot: data.snapshot ?? undefined } : { payments: [], total: 0, snapshot: data.snapshot ?? undefined }));
      })
      .catch(() => {
        if (!cancelled) setLedger((prev) => (prev ? { ...prev, snapshot: undefined } : prev));
      });
    return () => { cancelled = true; };
  }, [employeeId, month]);

  useEffect(() => {
    if (!employeeId) return;
    refetchAttendance();
  }, [employeeId, refetchAttendance]);

  const saveAttendance = useCallback(
    async (input: { month: string; fixedEntries?: { day: number; status: string }[]; dailyEntries?: { day: number; hoursWorked: number; overtimeHours: number; status: string }[] }) => {
      if (!employeeId) return;
      const data = await putAttendance(employeeId, input);
      setAttendance(data);
    },
    [employeeId]
  );

  const dataLoading = ledgerLoading || attendanceLoading;

  return {
    employee,
    ledger,
    attendance,
    loading,
    ledgerLoading,
    attendanceLoading,
    dataLoading,
    error,
    refetchLedger,
    refetchAttendance,
    refetchEmployee,
    saveAttendance,
  };
}
