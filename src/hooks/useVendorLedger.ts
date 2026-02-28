import { useState, useEffect, useCallback } from "react";
import { getVendorLedger, type ApiVendorLedger } from "@/services/vendorPaymentService";

const DEFAULT_PAGE_SIZE = 12;

export function useVendorLedger(
  vendorId: string,
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
) {
  const [ledger, setLedger] = useState<ApiVendorLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getVendorLedger(vendorId, { page, pageSize });
      setLedger(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendor ledger");
    } finally {
      setLoading(false);
    }
  }, [vendorId, page, pageSize]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ledger, loading, error, refetch };
}
