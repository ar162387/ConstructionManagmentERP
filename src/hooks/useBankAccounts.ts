import { useState, useEffect, useCallback } from "react";
import { listBankAccounts, type ApiBankAccount } from "@/services/bankAccountService";

export function useBankAccounts() {
  const [accounts, setAccounts] = useState<ApiBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listBankAccounts();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bank accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { accounts, loading, error, refetch };
}
