import { useState } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { formatCurrency } from "@/lib/mock-data";
import { useMockStore } from "@/context/MockStore";
import { AddVendorDialog } from "@/components/dialogs/AddVendorDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

export default function Vendors() {
  const { state } = useMockStore();
  const vendors = state.vendors;
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Layout>
      <PageHeader
        title="Vendors"
        subtitle="Supplier & vendor management"
        printTargetId="vendors-table"
        actions={<Button variant="warning" size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Vendor</Button>}
      />
      <AddVendorDialog open={addOpen} onOpenChange={setAddOpen} />
      <div id="vendors-table" className="border-2 border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Vendor</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Phone</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Total Billed</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Total Paid</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/vendors/${v.id}`} className="font-bold hover:underline">{v.name}</Link>
                    <p className="text-xs text-muted-foreground">{v.description}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">{v.phone}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatCurrency(v.totalBilled)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-success">{formatCurrency(v.totalPaid)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-destructive">{v.remaining > 0 ? formatCurrency(v.remaining) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
