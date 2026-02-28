import { useState, useEffect, useCallback } from "react";
import {
  getMachineLedger,
  type ApiMachineLedgerRow,
  type ApiMachineLedgerResult,
} from "@/services/machinesService";

const DEFAULT_PAGE_SIZE = 12;

export function useMachineLedger(
  machineId: string | undefined,
  page?: number,
  pageSize?: number
) {
  const [rows, setRows] = useState<ApiMachineLedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectivePage = page ?? 1;
  const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE;

  const refetch = useCallback(async () => {
    if (!machineId) {
      setRows([]);
      setTotal(0);
      setTotalHours(0);
      setTotalCost(0);
      setTotalPaid(0);
      setRemaining(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getMachineLedger(machineId, {
        page: effectivePage,
        pageSize: effectivePageSize,
      });
      setRows(data.rows);
      setTotal(data.total);
      setTotalHours(data.totalHours);
      setTotalCost(data.totalCost);
      setTotalPaid(data.totalPaid);
      setRemaining(data.remaining);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load machine ledger");
    } finally {
      setLoading(false);
    }
  }, [machineId, effectivePage, effectivePageSize]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    rows,
    total,
    totalHours,
    totalCost,
    totalPaid,
    remaining,
    loading,
    error,
    refetch,
  };
}
