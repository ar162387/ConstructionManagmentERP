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
            <div key={acc.id} className="border-2 border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-bold">{acc.bankName}</p>
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
        <div className="border-2 border-border">
          <div className="border-b-2 border-border bg-secondary px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wider">Recent Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Source</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Destination</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Mode</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Reference</th>
                </tr>
              </thead>
              <tbody>
                {bankTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 text-xs">{tx.date}</td>
                    <td className="px-4 py-3"><StatusBadge status={tx.type} /></td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-bold">{formatCurrency(tx.amount)}</td>
                    <td className="px-4 py-3 text-xs">{tx.source}</td>
                    <td className="px-4 py-3 text-xs">{tx.destination}</td>
                    <td className="px-4 py-3 text-xs">{tx.mode}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{tx.referenceId || "—"}</td>
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
