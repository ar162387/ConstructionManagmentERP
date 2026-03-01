import { useState, useEffect, useCallback } from "react";
import { listEmployees, type ApiEmployeeWithSnapshot } from "@/services/employeesService";

/** projectId: filter. month: optional, for per-month snapshot. */
export function useEmployees(projectId?: string | null, month?: string | null) {
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
        month ?? undefined
      );
      setEmployees(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [projectId, month]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { employees, loading, error, refetch };
}
