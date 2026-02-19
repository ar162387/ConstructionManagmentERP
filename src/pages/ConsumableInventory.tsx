import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { formatCurrency } from "@/lib/mock-data";
import { useMockStore } from "@/context/MockStore";
import { AddConsumableItemDialog } from "@/components/dialogs/AddConsumableItemDialog";
import { StockConsumptionDialog } from "@/components/dialogs/StockConsumptionDialog";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ConsumableInventory() {
  const { state } = useMockStore();
  const consumableItems = state.consumableItems;
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [consumptionOpen, setConsumptionOpen] = useState(false);

  return (
    <Layout>
      <PageHeader
        title="Consumable Inventory"
        subtitle="Materials that reduce with usage — per project"
        printTargetId="consumable-tabs"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setConsumptionOpen(true)}>
              <Minus className="h-4 w-4 mr-1" /> Stock Consumption
            </Button>
            <Button variant="warning" size="sm" onClick={() => setAddItemOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </>
        }
      />
      <AddConsumableItemDialog open={addItemOpen} onOpenChange={setAddItemOpen} />
      <StockConsumptionDialog open={consumptionOpen} onOpenChange={setConsumptionOpen} />

      <Tabs defaultValue="inventory" id="consumable-tabs">
        <TabsList>
          <TabsTrigger value="inventory">Item list</TabsTrigger>
          <TabsTrigger value="consumption">Stock consumption</TabsTrigger>
        </TabsList>
        <TabsContent value="inventory">
          <div className="border-2 border-border mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Item</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Unit</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Current Stock</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Total Purchased</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Total Amount</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Paid</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {consumableItems.map((item) => (
                    <tr key={item.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/inventory/consumable/${item.id}`} className="font-bold hover:underline">
                          {item.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs uppercase">{item.unit}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-bold">{item.currentStock.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{item.totalPurchased.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{formatCurrency(item.totalAmount)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-success">{formatCurrency(item.totalPaid)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-destructive">{item.totalPending > 0 ? formatCurrency(item.totalPending) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="consumption">
          <div className="border-2 border-border mt-4">
            <div className="border-b-2 border-border bg-secondary px-4 py-3">
              <h2 className="text-sm font-bold uppercase tracking-wider">Consumption history</h2>
            </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                      <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Project</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Items consumed</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.stockConsumptionEntries.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          No consumption recorded yet. Use “Record consumption” to add entries.
                        </td>
                      </tr>
                    ) : (
                      state.stockConsumptionEntries.map((sc) => (
                        <tr key={sc.id} className="border-b border-border hover:bg-accent/50">
                          <td className="px-4 py-3 text-xs">{sc.date}</td>
                          <td className="px-4 py-3 font-bold">{sc.projectName}</td>
                          <td className="px-4 py-3 text-xs">{sc.items.map((i) => `${i.itemName} (${i.quantityUsed} ${i.unit})`).join(", ")}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{sc.remarks || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
