import { useState } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { formatCurrency } from "@/lib/mock-data";
import { useMockStore } from "@/context/MockStore";
import { AddExpenseDialog } from "@/components/dialogs/AddExpenseDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Expenses() {
  const { state } = useMockStore();
  const expenses = state.expenses;
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Layout>
      <PageHeader
        title="Expenses"
        subtitle="Project-level expense tracking"
        printTargetId="expenses-table"
        actions={<Button variant="warning" size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Expense</Button>}
      />
      <AddExpenseDialog open={addOpen} onOpenChange={setAddOpen} />
      <div id="expenses-table" className="border-2 border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Description</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Category</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Project</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Mode</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 text-xs">{exp.date}</td>
                  <td className="px-4 py-3 font-bold text-xs">{exp.description}</td>
                  <td className="px-4 py-3 text-xs uppercase text-muted-foreground">{exp.category}</td>
                  <td className="px-4 py-3 text-xs">{exp.project}</td>
                  <td className="px-4 py-3 text-xs">{exp.paymentMode}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-bold">{formatCurrency(exp.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
