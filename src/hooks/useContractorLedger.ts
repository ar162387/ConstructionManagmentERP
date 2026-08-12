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
  pageSize: number = DEFAULT_PAGE_SIZE,
  startDate?: string,
  endDate?: string
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
          startDate,
          endDate,
        });
        const rows = startDate
          ? [{ type: "previous" as const, id: "previous-balance", date: "", amount: 0, remarks: "Previous", runningTotal: data.previousBalance }, ...data.rows]
          : data.rows;
        setLedger({
          rows,
          total: data.total,
          totalAmount: data.totalAmount,
          totalPaid: data.totalPaid,
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
  }, [projectId, month, contractorId ?? "", page, pageSize, startDate ?? "", endDate ?? ""]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ledger, loading, error, refetch, isAllTimeMode };
}
