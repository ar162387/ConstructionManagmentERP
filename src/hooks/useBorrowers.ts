import { useCallback, useEffect, useRef, useState } from "react";
import { listBorrowers, type ApiBorrower } from "@/services/borrowersService";

export function useBorrowers(archived = false) {
  const [borrowers, setBorrowers] = useState<ApiBorrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const latestRequest = useRef(0);
  const refetch = useCallback(async () => {
    const request = ++latestRequest.current;
    setLoading(true);
    try { const result = await listBorrowers(archived); if (request === latestRequest.current) { setBorrowers(result); setError(undefined); } }
    catch (err) { if (request === latestRequest.current) setError(err instanceof Error ? err.message : "Failed to load borrowers"); }
    finally { if (request === latestRequest.current) setLoading(false); }
  }, [archived]);
  useEffect(() => { void refetch(); return () => { latestRequest.current += 1; }; }, [refetch]);
  return { borrowers, loading, error, refetch };
}
