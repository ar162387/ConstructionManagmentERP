import { useState, useEffect, useCallback } from "react";
import { listVendors, type ApiVendor } from "@/services/vendorsService";

/** projectId: filter by project. Omit for all vendors (Admin dashboards). */
export function useVendors(projectId?: string | null) {
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listVendors(projectId ?? undefined);
      setVendors(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { vendors, loading, error, refetch };
}
