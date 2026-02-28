import { useState, useEffect, useCallback } from "react";
import {
  listMachines,
  type ApiMachineWithTotals,
  type ListMachinesResult,
} from "@/services/machinesService";

const DEFAULT_PAGE_SIZE = 12;

export function useMachines(
  projectId?: string | null,
  page?: number,
  pageSize?: number
) {
  const [result, setResult] = useState<ListMachinesResult>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectivePage = page ?? 1;
  const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMachines({
        projectId: projectId ?? undefined,
        page: effectivePage,
        pageSize: effectivePageSize,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load machines");
    } finally {
      setLoading(false);
    }
  }, [projectId, effectivePage, effectivePageSize]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    machines: result.items,
    total: result.total,
    loading,
    error,
    refetch,
  };
}
