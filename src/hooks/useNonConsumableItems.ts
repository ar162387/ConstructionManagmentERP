import { useState, useEffect, useCallback } from "react";
import { listNonConsumableItems, type ApiNonConsumableItem } from "@/services/nonConsumableItemService";

export function useNonConsumableItems() {
  const [items, setItems] = useState<ApiNonConsumableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listNonConsumableItems();
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, loading, error, refetch };
}
