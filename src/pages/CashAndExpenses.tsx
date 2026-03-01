import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { formatCurrency } from "@/lib/mock-data";
import { useAuth } from "@/context/AuthContext";
import { useSelectedProject } from "@/context/SelectedProjectContext";
import { useProjects } from "@/hooks/useProjects";
import { useCashExpensesReport } from "@/hooks/useCashExpensesReport";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CashExpensesEntityType } from "@/services/cashExpensesReportService";

function toTodayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function addDays(isoDate: string, delta: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

const ENTITY_TYPE_LABELS: Record<CashExpensesEntityType, string> = {
  Consumable: "Consumable",
  NonConsumable: "Non-Consumable",
  Vendor: "Vendor",
  Contractor: "Contractor",
  Salary: "Salary",
  Expense: "Expense",
  Machinery: "Machinery",
};

export default function CashAndExpenses() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const { selectedProjectId, setSelectedProjectId } = useSelectedProject();
  const isSiteManager = user?.role === "Site Manager";
  const assignedProjectId = user?.assignedProjectId ?? null;

  const effectiveProjectId = isSiteManager ? assignedProjectId : (selectedProjectId || null);
  const [reportDate, setReportDate] = useState(toTodayISO);

  const { report, loading, error, refetch } = useCashExpensesReport(
    effectiveProjectId ?? undefined,
    reportDate
  );

  const projectsForSelector = useMemo(
    () =>
      projects.filter(
        (p) =>
          p.status === "Active" || p.status === "On Hold" || p.status === "Completed"
      ),
    [projects]
  );

  const selectedProjectName =
    projects.find((p) => p.id === effectiveProjectId)?.name ?? "Project";

  const subtitle =
    isSiteManager && selectedProjectName
      ? `Daily report — ${selectedProjectName}`
      : effectiveProjectId
        ? `Daily report — ${selectedProjectName}`
        : "Daily report — Select project";

  const totalPayments =
    report?.totalPayments ??
    (report?.payments?.reduce((s, p) => s + p.amount, 0) ?? 0);

  const totalOpening =
    (report?.openingBalances?.projectLedger ?? 0) +
    (report?.openingBalances?.bankAccounts ?? []).reduce(
      (s, a) => s + a.openingBalance,
      0
    );

  const totalClosing =
    (report?.openingBalances?.projectLedgerClosing ?? 0) +
    (report?.openingBalances?.bankAccounts ?? []).reduce(
      (s, a) => s + (a.closingBalance ?? 0),
      0
    );

  const closingBalance = report?.closingBalance ?? totalClosing;

  return (
    <Layout>
      <PageHeader
        title="Cash & Expenses"
        subtitle={subtitle}
        printTargetId="cash-expenses-report"
      />

      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-4 p-4 border-2 border-border print-hidden">
          {!isSiteManager && (
            <div className="min-w-[200px]">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Project
              </Label>
              <Select
                value={selectedProjectId || ""}
                onValueChange={(v) => {
                  setSelectedProjectId(v);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projectsForSelector.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {isSiteManager && selectedProjectName && (
            <div className="min-w-[200px]">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Project
              </Label>
              <p className="mt-1.5 text-sm font-medium">{selectedProjectName}</p>
            </div>
          )}
          <div className="min-w-[220px]">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Report date
            </Label>
            <div className="mt-1 flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setReportDate(addDays(reportDate, -1))}
                title="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="date"
                className="flex-1 min-w-0"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setReportDate(addDays(reportDate, 1))}
                title="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading report…
          </p>
        ) : error ? (
          <p className="text-destructive py-8">{error}</p>
        ) : !effectiveProjectId ? (
          <p className="text-muted-foreground py-8">
            Select a project to view the cash & expenses report.
          </p>
        ) : (
          <div id="cash-expenses-report">
            {/* Balances */}
            {report?.openingBalances && (
              <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm mb-6">
                <div className="px-5 py-3 border-b border-border/40 bg-muted/10">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Opening balances ({reportDate})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-base">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/10 text-muted-foreground">
                        <th className="px-5 py-3 text-left text-sm font-medium">
                          Source / Account
                        </th>
                        <th className="px-5 py-3 text-right text-sm font-medium">
                          Opening balance
                        </th>
                        <th className="px-5 py-3 text-right text-sm font-medium">
                          Closing balance
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/40">
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">
                          Project ledger
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-sm font-medium">
                          {formatCurrency(
                            report.openingBalances.projectLedger ?? 0
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-sm font-medium">
                          {formatCurrency(
                            report.openingBalances.projectLedgerClosing ?? 0
                          )}
                        </td>
                      </tr>
                      {(report.openingBalances.bankAccounts ?? []).map((acc) => (
                        <tr
                          key={acc.id}
                          className="border-b border-border/40"
                        >
                          <td className="px-5 py-3.5 text-sm text-muted-foreground">
                            {acc.name}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-sm font-medium">
                            {formatCurrency(acc.openingBalance ?? 0)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-sm font-medium">
                            {formatCurrency(acc.closingBalance ?? 0)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-border/60 font-medium">
                        <td className="px-5 py-3.5 text-sm">Total</td>
                        <td className="px-5 py-3.5 text-right font-mono text-sm">
                          {formatCurrency(totalOpening)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-sm">
                          {formatCurrency(totalClosing)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payments table */}
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-border/40 bg-muted/10">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Payments ({reportDate})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/10 text-muted-foreground">
                      <th className="px-5 py-3 text-left text-sm font-medium">
                        Entity name
                      </th>
                      <th className="px-5 py-3 text-left text-sm font-medium">
                        Type
                      </th>
                      <th className="px-5 py-3 text-right text-sm font-medium">
                        Amount
                      </th>
                      <th className="px-5 py-3 text-left text-sm font-medium">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!report?.payments?.length ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-8 text-center text-muted-foreground"
                        >
                          No payments on this date
                        </td>
                      </tr>
                    ) : (
                      report.payments.map((p, i) => (
                        <tr
                          key={p.sourceId ?? `${p.entityName}-${i}`}
                          className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-5 py-3.5 text-sm font-medium">
                            {p.entityName}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-muted-foreground">
                            {ENTITY_TYPE_LABELS[p.entityType] ?? p.entityType}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-sm">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-muted-foreground max-w-xs truncate" title={p.remarks || undefined}>
                            {p.remarks || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {report?.payments?.length ? (
                    <tfoot>
                      <tr className="border-t-2 border-border/60 bg-warning/20 font-bold">
                        <td className="px-5 py-3.5 text-sm" colSpan={2}>
                          Total payments
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-sm">
                          {formatCurrency(totalPayments)}
                        </td>
                        <td className="px-5 py-3.5" />
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            </div>

            {/* Summary: Total payments & Closing balance (tabulated) */}
            {report?.openingBalances && (
              <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm mt-6">
                <div className="px-5 py-3 border-b border-border/40 bg-muted/10">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Summary ({reportDate})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-base">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/10 text-muted-foreground">
                        <th className="px-5 py-3 text-left text-sm font-medium">
                          Item
                        </th>
                        <th className="px-5 py-3 text-right text-sm font-medium">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/40">
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">
                          Total opening
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-sm font-medium">
                          {formatCurrency(totalOpening)}
                        </td>
                      </tr>
                      <tr className="border-b border-border/40 bg-warning/20 font-bold">
                        <td className="px-5 py-3.5 text-sm">
                          Total payments
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-sm">
                          {formatCurrency(totalPayments)}
                        </td>
                      </tr>
                      <tr className="border-t-2 border-border/60 font-semibold">
                        <td className="px-5 py-3.5 text-sm">
                          Day closing balance
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-sm">
                          {formatCurrency(closingBalance)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
