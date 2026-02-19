import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { useMockStore } from "@/context/MockStore";
import { AddNonConsumableItemDialog } from "@/components/dialogs/AddNonConsumableItemDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function NonConsumableInventory() {
  const { state } = useMockStore();
  const nonConsumableItems = state.nonConsumableItems;
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Layout>
      <PageHeader
        title="Non-Consumable Inventory"
        subtitle="Tools, assets & reusable equipment — Company-wide"
        printTargetId="nc-table"
        actions={<Button variant="warning" size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Asset</Button>}
      />
      <AddNonConsumableItemDialog open={addOpen} onOpenChange={setAddOpen} />
      <div id="nc-table" className="border-2 border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Item</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Category</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Total</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">In Store</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">In Use</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Repair</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Lost</th>
              </tr>
            </thead>
            <tbody>
              {nonConsumableItems.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/inventory/non-consumable/${item.id}`} className="font-bold hover:underline">{item.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-xs uppercase text-muted-foreground">{item.category}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-bold">{item.totalQuantity}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-success">{item.companyStore}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-info">{item.inUse}</td>
<td className="px-4 py-3 text-right font-mono text-xs text-warning">{item.underRepair > 0 ? item.underRepair : "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-destructive">{item.lost > 0 ? item.lost : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
