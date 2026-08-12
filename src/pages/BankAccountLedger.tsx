import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { getBankAccountLedger, type BankAccountLedgerResult } from "@/services/bankTransactionService";
import { formatCurrency } from "@/lib/mock-data";

export default function BankAccountLedger() {
  const { accountId } = useParams<{ accountId: string }>();
  const [ledger, setLedger] = useState<BankAccountLedgerResult>(); const [error, setError] = useState<string>();
  const [startDate, setStartDate] = useState(""); const [endDate, setEndDate] = useState("");
  useEffect(() => { if (!accountId) return; void getBankAccountLedger(accountId, { startDate: startDate || undefined, endDate: endDate || undefined }).then(setLedger).catch((err) => setError(err instanceof Error ? err.message : "Failed to load ledger")); }, [accountId, startDate, endDate]);
  return <Layout><Link to="/bank-accounts" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-3 w-3" />Back to Bank Accounts</Link><PageHeader title={`${ledger?.accountName ?? "Bank Account"} — Ledger`} subtitle="Chronological account ledger" printTargetId="bank-account-ledger" />
    <div className="flex gap-3 mb-4"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="max-w-44" /><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="max-w-44" /></div>
    {error ? <p className="text-destructive">{error}</p> : !ledger ? <p className="text-muted-foreground">Loading ledger…</p> : <div id="bank-account-ledger" className="rounded-xl border bg-card overflow-x-auto"><table className="min-w-max w-full text-sm"><thead><tr className="border-b bg-muted/10 text-muted-foreground"><th className="p-3 text-left">Date</th><th className="p-3 text-left">Reference / Remarks</th><th className="p-3 text-right">Received</th>{ledger.columns.map((column) => <th key={column.key} className="p-3 text-right">{column.label}</th>)}<th className="p-3 text-right">Balance</th></tr></thead><tbody>{ledger.rows.map((row) => <tr key={row.id} className="border-b"><td className="p-3">{row.date}</td><td className="p-3">{row.particulars}</td><td className="p-3 text-right">{row.received ? formatCurrency(row.received) : "—"}</td>{ledger.columns.map((column) => <td key={column.key} className="p-3 text-right">{row.outflows[column.key] ? formatCurrency(row.outflows[column.key]) : "—"}</td>)}<td className="p-3 text-right font-mono font-medium">{formatCurrency(row.balance)}</td></tr>)}</tbody></table></div>}</Layout>;
}
