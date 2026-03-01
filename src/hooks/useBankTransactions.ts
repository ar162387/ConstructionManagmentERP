import { useState, useEffect, useCallback } from "react";
import {
  listBankTransactions,
  type ApiBankTransaction,
  type ListBankTransactionsParams,
} from "@/services/bankTransactionService";

export function useBankTransactions(params: ListBankTransactionsParams = {}) {
  const [rows, setRows] = useState<ApiBankTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listBankTransactions(params);
      setRows(result.rows);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [params.page, params.pageSize, params.search, params.startDate, params.endDate]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { rows, total, loading, error, refetch };
}
