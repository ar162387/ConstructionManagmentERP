import { useState, useEffect, useCallback } from "react";
import {
  listNonConsumableLedger,
  type ApiNonConsumableLedgerEntry,
} from "@/services/nonConsumableLedgerService";

const DEFAULT_PAGE_SIZE = 12;

export function useNonConsumableLedger(
  itemId: string,
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
) {
  const [entries, setEntries] = useState<ApiNonConsumableLedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listNonConsumableLedger(itemId, { page, pageSize });
      setEntries(result.entries);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  }, [itemId, page, pageSize]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { entries, total, loading, error, refetch };
}
