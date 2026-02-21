import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { useMockStore } from "@/context/MockStore";
import { AddMachineDialog } from "@/components/dialogs/AddMachineDialog";
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

export default function Machinery() {
  const { state } = useMockStore();
  const { machines: allMachines, projects, users, currentUserId } = state;
  const [addOpen, setAddOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(ALL_PROJECTS);

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? users[0],
    [users, currentUserId]
  );
  const isSiteManager = currentUser?.role === "Site Manager";
  const projectFilterName = isSiteManager ? currentUser?.assignedProjectName ?? null : null;

  const machinesInScope = useMemo(() => {
    if (isSiteManager && projectFilterName) {
      return allMachines.filter((m) => m.project === projectFilterName);
    }
    if (selectedProjectId === ALL_PROJECTS) return allMachines;
    const proj = projects.find((p) => p.id === selectedProjectId);
    if (!proj) return allMachines;
    return allMachines.filter((m) => m.project === proj.name);
  }, [allMachines, isSiteManager, projectFilterName, selectedProjectId, projects]);

  const projectsForSelector = useMemo(
    () => projects.filter((p) => p.status === "Active" || p.status === "On Hold"),
    [projects]
  );

  const subtitle =
    isSiteManager && projectFilterName
      ? `Company owned & rented machinery — ${projectFilterName}`
      : selectedProjectId === ALL_PROJECTS
        ? "Company owned & rented machinery — All Projects"
        : `Company owned & rented machinery — ${projects.find((p) => p.id === selectedProjectId)?.name ?? "Project"}`;

  return (
    <Layout>
      <PageHeader
        title="Machinery"
        subtitle={subtitle}
        printTargetId="machinery-table"
        actions={<Button variant="warning" size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Machine</Button>}
      />
      <AddMachineDialog
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
            <p className="text-xs text-muted-foreground mt-1">Group machinery by project</p>
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
              {machinesInScope.map((m) => (
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
