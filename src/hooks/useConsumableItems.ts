import { useState, useEffect, useCallback } from "react";
import { listConsumableItems, type ApiConsumableItem } from "@/services/consumableItemsService";

export function useConsumableItems(projectId?: string | null) {
  const [items, setItems] = useState<ApiConsumableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listConsumableItems(projectId ?? undefined);
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, loading, error, refetch };
}
