import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { formatCurrency } from "@/lib/mock-data";
import { useMockStore } from "@/context/MockStore";
import { AddExpenseDialog } from "@/components/dialogs/AddExpenseDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

const ALL_PROJECTS = "__all__";

export default function Expenses() {
  const { state } = useMockStore();
  const { expenses: allExpenses, projects, users, currentUserId } = state;
  const [addOpen, setAddOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(ALL_PROJECTS);

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? users[0],
    [users, currentUserId]
  );
  const isSiteManager = currentUser?.role === "Site Manager";
  const projectFilterName = isSiteManager ? currentUser?.assignedProjectName ?? null : null;

  const expensesInScope = useMemo(() => {
    if (isSiteManager && projectFilterName) {
      return allExpenses.filter((e) => e.project === projectFilterName);
    }
    if (selectedProjectId === ALL_PROJECTS) return allExpenses;
    const proj = projects.find((p) => p.id === selectedProjectId);
    if (!proj) return allExpenses;
    return allExpenses.filter((e) => e.project === proj.name);
  }, [allExpenses, isSiteManager, projectFilterName, selectedProjectId, projects]);

  const projectsForSelector = useMemo(
    () => projects.filter((p) => p.status === "Active" || p.status === "On Hold"),
    [projects]
  );

  const subtitle =
    isSiteManager && projectFilterName
      ? `Project-level expense tracking — ${projectFilterName}`
      : selectedProjectId === ALL_PROJECTS
        ? "Project-level expense tracking — All Projects"
        : `Project-level expense tracking — ${projects.find((p) => p.id === selectedProjectId)?.name ?? "Project"}`;

  return (
    <Layout>
      <PageHeader
        title="Expenses"
        subtitle={subtitle}
        printTargetId="expenses-table"
        actions={<Button variant="warning" size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Expense</Button>}
      />
      <AddExpenseDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        restrictedProjectId={isSiteManager ? currentUser?.assignedProjectId : undefined}
        restrictedProjectName={isSiteManager ? currentUser?.assignedProjectName : undefined}
      />
      <div className="flex flex-wrap items-end gap-4 p-4 border-2 border-border mb-4">
        {!isSiteManager && (
          <div className="min-w-[200px]">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROJECTS}>All Projects</SelectItem>
                {projectsForSelector.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Group expenses by project</p>
          </div>
        )}
        {isSiteManager && projectFilterName && (
          <div className="min-w-[200px]">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project</Label>
            <p className="mt-1.5 text-sm font-medium">{projectFilterName}</p>
            <p className="text-xs text-muted-foreground">Your assigned project (Site Manager)</p>
          </div>
        )}
      </div>
      <div id="expenses-table" className="border-2 border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Description</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Category</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Mode</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expensesInScope.map((exp) => (
                <tr key={exp.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 text-xs">{exp.date}</td>
                  <td className="px-4 py-3 font-bold text-xs">{exp.description}</td>
                  <td className="px-4 py-3 text-xs uppercase text-muted-foreground">{exp.category}</td>
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
