import { useState, useEffect, useCallback } from "react";
import {
  getContractorLedger,
  getContractorLedgerAllTime,
  type ApiContractorLedger,
} from "@/services/contractorLedgerService";

const DEFAULT_PAGE_SIZE = 12;

export function useContractorLedger(
  projectId: string | null,
  month: string,
  contractorId?: string | null,
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
) {
  const [ledger, setLedger] = useState<ApiContractorLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAllTimeMode = Boolean(contractorId);

  const refetch = useCallback(async () => {
    if (!projectId) {
      setLedger(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (contractorId) {
        const data = await getContractorLedgerAllTime(projectId, contractorId, {
          page,
          pageSize,
        });
        setLedger({
          rows: data.rows,
          total: data.total,
          totalAmount: 0,
          totalPaid: 0,
          remaining: 0,
        });
      } else {
        const data = await getContractorLedger(projectId, month, {
          page,
          pageSize,
        });
        setLedger(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contractor ledger");
    } finally {
      setLoading(false);
    }
  }, [projectId, month, contractorId ?? "", page, pageSize]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ledger, loading, error, refetch, isAllTimeMode };
}
