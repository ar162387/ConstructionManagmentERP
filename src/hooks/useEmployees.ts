import { useState, useEffect, useCallback } from "react";
import { listEmployees, type ApiEmployeeWithSnapshot } from "@/services/employeesService";

/** projectId: filter. month: optional, for per-month snapshot.
 *  startDate/endDate: optional inclusive date range — when both set, totalPaid/totalDue reflect that period. */
export function useEmployees(
  projectId?: string | null,
  month?: string | null,
  category: "Regular" | "Machinery" = "Regular",
  startDate?: string | null,
  endDate?: string | null
) {
  const [employees, setEmployees] = useState<ApiEmployeeWithSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (options?: { silent?: boolean }) => {
    const effectiveProjectId = projectId && projectId !== "__all__" ? projectId : undefined;
    if (!options?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const list = await listEmployees(
        effectiveProjectId,
        month ?? undefined,
        category,
        startDate ?? undefined,
        endDate ?? undefined
      );
      setEmployees(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [projectId, month, category, startDate, endDate]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { employees, loading, error, refetch };
}
