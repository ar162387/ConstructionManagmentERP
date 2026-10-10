import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { getBorrowerLedger, type BorrowerLedgerResult, type BorrowerLedgerRow } from "@/services/borrowersService";
import { deleteBankTransaction } from "@/services/bankTransactionService";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/mock-data";
import { formatDisplayDate } from "@/lib/pktDate";
import { toast } from "sonner";

export default function BorrowerLedger() {
  const { borrowerId } = useParams<{ borrowerId: string }>();
  const { user } = useAuth();
  const canDelete = user?.role === "Super Admin";
  const [ledger, setLedger] = useState<BorrowerLedgerResult>();
  const [error, setError] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deleting, setDeleting] = useState<BorrowerLedgerRow>();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    setError(undefined); setLedger(undefined);
    if (borrowerId) void getBorrowerLedger(borrowerId).then((data) => { if (active) setLedger(data); }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "Failed to load ledger"); });
    return () => { active = false; };
  }, [borrowerId, refresh]);
  const rows = useMemo(() => ledger?.rows.filter((row) => (!startDate || row.date >= startDate) && (!endDate || row.date <= endDate)) ?? [], [ledger, startDate, endDate]);
  const remove = async () => {
    if (!deleting) return; setSaving(true);
    try { await deleteBankTransaction(deleting.id); setDeleting(undefined); setRefresh((n) => n + 1); toast.success("Payment deleted from both ledgers"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed to delete payment"); }
    finally { setSaving(false); }
  };
  return <Layout>
    <Link to="/borrowers" className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground mb-4"><ArrowLeft className="h-3 w-3" />Back to Borrowers</Link>
    <PageHeader title={`${ledger?.borrowerName ?? "Borrower"} — Ledger`} subtitle={ledger?.archived ? "Archived borrower — payment history preserved" : "Loans and repayments across all banks"} printTargetId="borrower-ledger" printOptions={{ printDocumentTitle: `${ledger?.borrowerName ?? "Borrower"} Loan Ledger` }} />
    <div className="flex gap-3 mb-4"><Input aria-label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="max-w-44" /><Input aria-label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="max-w-44" /></div>
    <p className="text-xs text-muted-foreground mb-4">Running balance shows the amount owed after each entry: loans given minus repayments received across all banks.</p>
    {error ? <p className="text-destructive">{error}</p> : !ledger ? <p className="text-muted-foreground">Loading ledger…</p> : <div id="borrower-ledger">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">{[["Total Loaned", ledger.totalLoaned], ["Total Repaid", ledger.totalRepaid], ["Outstanding", ledger.outstanding]].map(([label, value]) => <div key={label} className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="font-mono font-semibold">{formatCurrency(Number(value))}</p></div>)}</div>
      <div className="rounded-xl border bg-card overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/10"><th className="p-3 text-left">Date</th><th className="p-3 text-left">Bank Account</th><th className="p-3 text-left">Reference / Remarks</th><th className="p-3 text-right">Loan Given</th><th className="p-3 text-right">Repayment Received</th><th className="p-3 text-right whitespace-nowrap">Running Balance</th>{canDelete && <th className="p-3 text-right print-hidden">Actions</th>}</tr></thead>
        <tbody>{rows.length ? rows.map((row) => <tr key={row.id} className="border-b"><td className="p-3">{formatDisplayDate(row.date)}</td><td className="p-3"><Link className="text-primary hover:underline" to={`/bank-accounts/${row.accountId}/ledger`}>{row.accountName}</Link></td><td className="p-3">{[row.type === "inflow" ? "Loan payment" : "Loan given", row.borrowerName, row.referenceId, row.remarks].filter(Boolean).join(" — ")}</td><td className="p-3 text-right">{row.loanGiven ? formatCurrency(row.loanGiven) : "—"}</td><td className="p-3 text-right">{row.repayment ? formatCurrency(row.repayment) : "—"}</td><td className="p-3 text-right font-mono font-medium whitespace-nowrap">{formatCurrency(row.balance)}</td>{canDelete && <td className="p-3 text-right print-hidden"><Button variant="ghost" size="icon" aria-label={`Delete payment ${row.id}`} className="text-destructive" onClick={() => setDeleting(row)}><Trash2 className="h-4 w-4" /></Button></td>}</tr>) : <tr><td colSpan={canDelete ? 7 : 6} className="p-6 text-center text-muted-foreground">No payments in the selected date range.</td></tr>}</tbody>
      </table></div>
    </div>}
    <AlertDialog open={!!deleting} onOpenChange={(open) => !open && !saving && setDeleting(undefined)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete payment?</AlertDialogTitle><AlertDialogDescription>This reverses {formatCurrency(deleting?.amount ?? 0)} in the bank and removes the entry from both ledgers. Deletion is blocked if it makes the bank balance or any borrower balance negative. An archived borrower will be reactivated if money becomes owed again.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={(e) => { e.preventDefault(); void remove(); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </Layout>;
}
