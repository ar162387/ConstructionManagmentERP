import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { formatCurrency } from "@/lib/mock-data";
import { useMockStore } from "@/context/MockStore";
import { AddLedgerEntryDialog } from "@/components/dialogs/AddLedgerEntryDialog";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";

export default function ItemLedger() {
  const { itemId } = useParams();
  const { state, actions } = useMockStore();
  const consumableItems = state.consumableItems;
  const item = consumableItems.find((i) => i.id === itemId) || consumableItems[0];
  const ledger = actions.getLedgerForItem(item?.id ?? "");
  const [addEntryOpen, setAddEntryOpen] = useState(false);

  return (
    <Layout>
      <Link to="/inventory/consumable" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3 w-3" /> Back to Inventory
      </Link>

      <PageHeader
        title={`${item.name} Ledger`}
        subtitle={`Unit: ${item.unit} — Current Stock: ${item.currentStock.toLocaleString()}`}
        printTargetId="item-ledger"
        actions={<Button variant="warning" size="sm" onClick={() => setAddEntryOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Entry</Button>}
      />
      <AddLedgerEntryDialog open={addEntryOpen} onOpenChange={setAddEntryOpen} itemId={item.id} itemName={item.name} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatCard label="Current Stock" value={item.currentStock.toLocaleString()} variant="info" />
        <StatCard label="Total Amount" value={formatCurrency(item.totalAmount)} />
        <StatCard label="Total Paid" value={formatCurrency(item.totalPaid)} variant="success" />
        <StatCard label="Pending" value={formatCurrency(item.totalPending)} variant={item.totalPending > 0 ? "destructive" : "default"} />
      </div>

      <div id="item-ledger" className="border-2 border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Date</th>
                <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Qty</th>
                <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Unit Price</th>
                <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Total</th>
                <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Paid</th>
                <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Due</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Vendor</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Payment</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Ref / Vehicle</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => (
                <tr key={entry.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                  <td className="px-3 py-3 text-xs">{entry.date}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs">{entry.quantity}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs">{formatCurrency(entry.unitPrice)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs font-bold">{formatCurrency(entry.totalPrice)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-success">{formatCurrency(entry.paidAmount)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-destructive">{entry.remaining > 0 ? formatCurrency(entry.remaining) : "—"}</td>
                  <td className="px-3 py-3 text-xs font-bold">{entry.vendor}</td>
                  <td className="px-3 py-3 text-xs">{entry.paymentMethod}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {entry.referenceId && <span>{entry.referenceId}</span>}
                    {entry.vehicleNumber && <span className="block">{entry.vehicleNumber}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
