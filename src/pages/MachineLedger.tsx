import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { formatCurrency } from "@/lib/mock-data";
import { useMockStore } from "@/context/MockStore";
import { AddMachineLedgerEntryDialog } from "@/components/dialogs/AddMachineLedgerEntryDialog";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";

export default function MachineLedger() {
  const { machineId } = useParams();
  const { state } = useMockStore();
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const machine = state.machines.find((m) => m.id === machineId);
  const entries = state.machineLedgerEntries.filter((e) => e.machineId === machineId);

  if (!machine) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Machine not found.</p>
          <Link to="/machinery" className="ml-2 text-primary hover:underline">Back to list</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link to="/machinery" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3 w-3" /> Back to Machinery
      </Link>

      <PageHeader
        title={`${machine.name} — Ledger`}
        subtitle={`${machine.ownership} | Rate: ${formatCurrency(machine.hourlyRate)}/hr`}
        printTargetId="machine-ledger"
        actions={<Button variant="warning" size="sm" onClick={() => setAddEntryOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Entry</Button>}
      />

      <AddMachineLedgerEntryDialog open={addEntryOpen} onOpenChange={setAddEntryOpen} machine={machine} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatCard label="Total Hours" value={machine.totalHours.toString()} variant="info" />
        <StatCard label="Total Cost" value={formatCurrency(machine.totalCost)} />
        <StatCard label="Total Paid" value={formatCurrency(machine.totalPaid)} variant="success" />
        <StatCard label="Pending" value={formatCurrency(machine.totalPending)} variant={machine.totalPending > 0 ? "destructive" : "default"} />
      </div>

      <div id="machine-ledger" className="border-2 border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Date</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Hours</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Used By</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Total Cost</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Paid</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Remaining</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No ledger entries yet.</td></tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 text-xs">{entry.date}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{entry.hoursWorked}</td>
                    <td className="px-4 py-3 text-xs">{entry.usedBy || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-bold">{formatCurrency(entry.totalCost)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-success">{formatCurrency(entry.paidAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-destructive">{entry.remaining > 0 ? formatCurrency(entry.remaining) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{entry.remarks || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
