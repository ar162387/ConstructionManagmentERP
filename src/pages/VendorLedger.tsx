import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { formatCurrency } from "@/lib/mock-data";
import { useMockStore } from "@/context/MockStore";
import { VendorPaymentDialog } from "@/components/dialogs/VendorPaymentDialog";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function VendorLedger() {
  const { vendorId } = useParams();
  const { state, actions } = useMockStore();
  const vendors = state.vendors;
  const vendor = vendors.find((v) => v.id === vendorId) || vendors[0];
  const ledger = actions.getLedgerForItem("CI001").filter((l) => l.vendor === vendor.name);
  const [paymentOpen, setPaymentOpen] = useState(false);

  return (
    <Layout>
      <Link to="/vendors" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3 w-3" /> Back to Vendors
      </Link>

      <PageHeader
        title={`${vendor.name} — Ledger`}
        subtitle={vendor.description}
        printTargetId="vendor-ledger"
        actions={<Button variant="warning" size="sm" onClick={() => setPaymentOpen(true)}><Plus className="h-4 w-4 mr-1" />Record Payment</Button>}
      />
      <VendorPaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} vendor={vendor} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-6">
        <StatCard label="Total Billed" value={formatCurrency(vendor.totalBilled)} />
        <StatCard label="Total Paid" value={formatCurrency(vendor.totalPaid)} variant="success" />
        <StatCard label="Remaining" value={formatCurrency(vendor.remaining)} variant={vendor.remaining > 0 ? "destructive" : "success"} />
      </div>

      <div id="vendor-ledger" className="border-2 border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Item</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Qty</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Total</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Paid</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Due</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Payment</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length > 0 ? ledger.map((entry) => (
                <tr key={entry.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 text-xs">{entry.date}</td>
                  <td className="px-4 py-3 text-xs font-bold">Cement</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{entry.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatCurrency(entry.totalPrice)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-success">{formatCurrency(entry.paidAmount)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-destructive">{entry.remaining > 0 ? formatCurrency(entry.remaining) : "—"}</td>
                  <td className="px-4 py-3 text-xs">{entry.paymentMethod}</td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No transactions found for this vendor</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
