import { useState, useEffect, useCallback } from "react";
import {
  getProjectLedger,
  type GetProjectLedgerResult,
} from "@/services/projectLedgerService";

export function useProjectLedger(
  projectId: string | undefined,
  params?: { page?: number; pageSize?: number }
) {
  const [ledger, setLedger] = useState<GetProjectLedgerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getProjectLedger(projectId, params);
      setLedger(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project ledger");
    } finally {
      setLoading(false);
    }
  }, [projectId, params?.page, params?.pageSize]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ledger, loading, error, refetch };
}
