import { useState, useEffect, useCallback } from "react";
import { listStockConsumption, type ApiStockConsumption } from "@/services/stockConsumptionService";

export function useStockConsumption(projectId?: string | null) {
  const [entries, setEntries] = useState<ApiStockConsumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listStockConsumption(projectId ?? undefined);
      setEntries(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load consumption entries");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { entries, loading, error, refetch };
}
