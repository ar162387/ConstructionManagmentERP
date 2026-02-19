import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { useMockStore } from "@/context/MockStore";
import { AddMachineDialog } from "@/components/dialogs/AddMachineDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Machinery() {
  const { state } = useMockStore();
  const machines = state.machines;
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Layout>
      <PageHeader
        title="Machinery"
        subtitle="Company owned & rented machinery tracking"
        printTargetId="machinery-table"
        actions={<Button variant="warning" size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Machine</Button>}
      />
      <AddMachineDialog open={addOpen} onOpenChange={setAddOpen} />
      <div id="machinery-table" className="border-2 border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Machine</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Ownership</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Rate/Hr</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Hours</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Total Cost</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Paid</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Pending</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => (
                <tr key={m.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/machinery/${m.id}`} className="font-bold hover:underline">{m.name}</Link>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={m.ownership} /></td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatCurrency(m.hourlyRate)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{m.totalHours}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-bold">{formatCurrency(m.totalCost)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-success">{formatCurrency(m.totalPaid)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-destructive">{m.totalPending > 0 ? formatCurrency(m.totalPending) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
