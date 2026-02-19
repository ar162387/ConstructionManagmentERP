import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { useMockStore } from "@/context/MockStore";
import { AddNonConsumableEntryDialog } from "@/components/dialogs/AddNonConsumableEntryDialog";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";

export default function NonConsumableItemLedger() {
  const { itemId } = useParams();
  const { state } = useMockStore();
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const item = state.nonConsumableItems.find((i) => i.id === itemId);
  const ledger = state.nonConsumableLedger.filter((e) => e.itemId === itemId);

  if (!item) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Item not found.</p>
          <Link to="/inventory/non-consumable" className="ml-2 text-primary hover:underline">Back to list</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link to="/inventory/non-consumable" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3 w-3" /> Back to Non-Consumable
      </Link>

      <PageHeader
        title={`${item.name} — Asset Ledger`}
        subtitle={`Category: ${item.category}`}
        printTargetId="nc-ledger"
        actions={<Button variant="warning" size="sm" onClick={() => setAddEntryOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Entry</Button>}
      />

      <AddNonConsumableEntryDialog open={addEntryOpen} onOpenChange={setAddEntryOpen} itemId={item.id} itemName={item.name} />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatCard label="Total Quantity" value={String(item.totalQuantity)} variant="info" />
        <StatCard label="Company Store (Available)" value={String(item.companyStore)} variant="success" />
        <StatCard label="In Use (Projects)" value={String(item.inUse)} variant="info" />
        <StatCard label="Under Repair / Lost" value={String(item.underRepair + item.lost)} variant="warning" />
      </div>

      {/* Movement / Ledger table */}
      <div id="nc-ledger" className="border-2 border-border">
        <div className="border-b-2 border-border bg-secondary px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wider">Movement history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Date</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Event Type</th>
                <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Qty</th>
                <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Cost</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Vendor / Project</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No ledger entries yet. Add an entry to start tracking.</td></tr>
              ) : (
                ledger.map((entry) => (
                  <tr key={entry.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                    <td className="px-3 py-3 text-xs">{entry.date}</td>
                    <td className="px-3 py-3 text-xs font-bold">{entry.eventType}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs">{entry.quantity}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs">{entry.unitPrice != null ? formatCurrency(entry.unitPrice) : entry.cost != null ? formatCurrency(entry.cost) : "—"}</td>
                    <td className="px-3 py-3 text-xs">{entry.vendorName || entry.projectTo || entry.projectFrom || "—"}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{entry.remarks || "—"}</td>
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
