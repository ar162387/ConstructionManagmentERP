import { useState } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { useMockStore } from "@/context/MockStore";
import { AddBankAccountDialog } from "@/components/dialogs/AddBankAccountDialog";
import { AddBankTransactionDialog } from "@/components/dialogs/AddBankTransactionDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function BankAccounts() {
  const { state } = useMockStore();
  const { bankAccounts, bankTransactions } = state;
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [addTxOpen, setAddTxOpen] = useState(false);

  return (
    <Layout>
      <PageHeader
        title="Bank & Accounts"
        subtitle="Company-level bank account management"
        printTargetId="bank-content"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setAddTxOpen(true)}>Add Transaction</Button>
            <Button variant="warning" size="sm" onClick={() => setAddAccountOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Account</Button>
          </>
        }
      />
      <AddBankAccountDialog open={addAccountOpen} onOpenChange={setAddAccountOpen} />
      <AddBankTransactionDialog open={addTxOpen} onOpenChange={setAddTxOpen} />

      <div id="bank-content" className="space-y-6">
        {/* Account Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {bankAccounts.map((acc) => (
            <div key={acc.id} className="rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{acc.bankName}</p>
                <span className="text-xs font-mono text-muted-foreground">{acc.accountNumber}</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(acc.currentBalance)}</p>
              <div className="flex gap-4 text-xs">
                <span className="text-success">↑ {formatCurrency(acc.totalInflow)}</span>
                <span className="text-destructive">↓ {formatCurrency(acc.totalOutflow)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="border-b border-border/40 bg-muted/30 px-5 py-4 backdrop-blur-sm">
            <h2 className="text-sm font-semibold tracking-tight">Recent Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-border/40 bg-muted/10 text-muted-foreground">
                  <th className="px-5 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-5 py-3 text-left text-sm font-medium">Type</th>
                  <th className="px-5 py-3 text-right text-sm font-medium">Amount</th>
                  <th className="px-5 py-3 text-left text-sm font-medium">Source</th>
                  <th className="px-5 py-3 text-left text-sm font-medium">Destination</th>
                  <th className="px-5 py-3 text-left text-sm font-medium">Mode</th>
                  <th className="px-5 py-3 text-left text-sm font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {bankTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{tx.date}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={tx.type} /></td>
                    <td className="px-5 py-3.5 text-right font-mono text-sm font-medium">{formatCurrency(tx.amount)}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{tx.source}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{tx.destination}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{tx.mode}</td>
                    <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground/70">{tx.referenceId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
