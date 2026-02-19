import { useState } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { useMockStore } from "@/context/MockStore";
import { CreateProjectDialog } from "@/components/dialogs/CreateProjectDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Plus, Calendar, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/mock-data";

function ProjectCard({ p }: { p: Project }) {
  const budgetPercent = p.allocatedBudget > 0 ? Math.min(100, (p.spent / p.allocatedBudget) * 100) : 0;
  const isOverBudget = p.spent > p.allocatedBudget;

  return (
    <Card className="flex flex-col border-2 border-border hover:border-primary/30 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-muted-foreground truncate">{p.id}</p>
            <h3 className="font-bold text-lg break-words">{p.name}</h3>
          </div>
          <StatusBadge status={p.status} />
        </div>
        {p.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-3 pt-0">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              Budget
            </span>
            <span className="font-mono text-xs">{formatCurrency(p.allocatedBudget)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Spent</span>
            <span className={cn("font-mono text-xs", isOverBudget && "text-destructive font-semibold")}>
              {formatCurrency(p.spent)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isOverBudget ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${Math.min(100, budgetPercent)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{p.startDate} → {p.endDate}</span>
        </div>
      </CardContent>
      <CardFooter className="pt-0 border-t border-border mt-auto">
        <p className="text-xs text-muted-foreground">
          {budgetPercent.toFixed(0)}% of budget used
          {isOverBudget && " (over budget)"}
        </p>
      </CardFooter>
    </Card>
  );
}

export default function Projects() {
  const { state } = useMockStore();
  const [createOpen, setCreateOpen] = useState(false);
  const projects = state.projects;

  return (
    <Layout>
      <PageHeader
        title="Projects"
        subtitle="Manage all construction projects"
        printTargetId="projects-cards"
        actions={
          <Button variant="warning" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Project
          </Button>
        }
      />
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      <div id="projects-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {projects.map((p) => (
          <ProjectCard key={p.id} p={p} />
        ))}
      </div>
    </Layout>
  );
}
