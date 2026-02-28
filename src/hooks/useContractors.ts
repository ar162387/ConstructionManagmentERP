import { useState, useEffect, useCallback } from "react";
import { listContractors, type ApiContractorWithTotals } from "@/services/contractorsService";

/** projectId: filter by project. Omit for all contractors (Admin dashboards). Site Manager uses assigned project. */
export function useContractors(projectId?: string | null) {
  const [contractors, setContractors] = useState<ApiContractorWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listContractors(projectId ?? undefined);
      setContractors(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contractors");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { contractors, loading, error, refetch };
}
