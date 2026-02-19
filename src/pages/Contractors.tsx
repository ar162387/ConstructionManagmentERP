import { useState, useMemo, useEffect } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { formatCurrency, formatCurrencyCompact } from "@/lib/mock-data";
import { useMockStore } from "@/context/MockStore";
import { AddContractorDialog } from "@/components/dialogs/AddContractorDialog";
import { AddContractorEntryDialog } from "@/components/dialogs/AddContractorEntryDialog";
import { ContractorPaymentDialog } from "@/components/dialogs/ContractorPaymentDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight, Banknote } from "lucide-react";

const ALL_CONTRACTORS = "__all__";
const ALL_PROJECTS = "__all__";

function getMonthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

export default function Contractors() {
  const { state } = useMockStore();
  const { contractors, contractorEntries, contractorPayments, projects, users, currentUserId } = state;

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? users[0],
    [users, currentUserId]
  );
  const isSiteManager = currentUser?.role === "Site Manager";
  const projectFilterName = isSiteManager ? currentUser?.assignedProjectName ?? null : null;

  const [selectedProjectId, setSelectedProjectId] = useState<string>(ALL_PROJECTS);
  const [selectedId, setSelectedId] = useState<string>(ALL_CONTRACTORS);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [contractorSearch, setContractorSearch] = useState("");
  const [addContractorOpen, setAddContractorOpen] = useState(false);
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const contractorsInScope = useMemo(() => {
    if (isSiteManager && projectFilterName) {
      return contractors.filter((c) => c.project === projectFilterName);
    }
    if (selectedProjectId === ALL_PROJECTS) return contractors;
    const proj = projects.find((p) => p.id === selectedProjectId);
    if (!proj) return contractors;
    return contractors.filter((c) => c.project === proj.name);
  }, [contractors, isSiteManager, projectFilterName, selectedProjectId, projects]);

  const contractorIdsInScope = useMemo(() => new Set(contractorsInScope.map((c) => c.id)), [contractorsInScope]);

  const filteredContractorsForDropdown = useMemo(() => {
    if (!contractorSearch.trim()) return contractorsInScope;
    const q = contractorSearch.trim().toLowerCase();
    return contractorsInScope.filter(
      (c) => c.name.toLowerCase().includes(q) || c.project.toLowerCase().includes(q)
    );
  }, [contractorsInScope, contractorSearch]);

  const entriesInMonth = useMemo(() => {
    const inMonth = contractorEntries.filter((e) => e.date.startsWith(currentMonth));
    return inMonth.filter((e) => contractorIdsInScope.has(e.contractorId));
  }, [contractorEntries, currentMonth, contractorIdsInScope]);

  const paymentsInMonth = useMemo(() => {
    const inMonth = contractorPayments.filter((p) => p.date.startsWith(currentMonth));
    return inMonth.filter((p) => contractorIdsInScope.has(p.contractorId));
  }, [contractorPayments, currentMonth, contractorIdsInScope]);

  const tableEntries = useMemo(() => {
    let list = entriesInMonth.map((e) => {
      const contractor = contractorsInScope.find((c) => c.id === e.contractorId);
      return { ...e, contractorName: contractor?.name ?? "—", project: contractor?.project ?? "" };
    });
    if (selectedId !== ALL_CONTRACTORS) {
      list = list.filter((e) => e.contractorId === selectedId);
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [entriesInMonth, selectedId, contractorsInScope]);

  const monthlyTotal = useMemo(() => {
    let entries = entriesInMonth;
    if (selectedId !== ALL_CONTRACTORS) entries = entries.filter((e) => e.contractorId === selectedId);
    return entries.reduce((s, e) => s + e.amount, 0);
  }, [entriesInMonth, selectedId]);

  const monthlyPaid = useMemo(() => {
    let payments = paymentsInMonth;
    if (selectedId !== ALL_CONTRACTORS) payments = payments.filter((p) => p.contractorId === selectedId);
    return payments.reduce((s, p) => s + p.amount, 0);
  }, [paymentsInMonth, selectedId]);

  const monthlyRemaining = monthlyTotal - monthlyPaid;
  const selectedContractor = selectedId !== ALL_CONTRACTORS ? contractorsInScope.find((c) => c.id === selectedId) ?? null : null;

  const canGoNext = currentMonth < new Date().toISOString().slice(0, 7);

  const projectsForSelector = useMemo(() => projects.filter((p) => p.status === "Active" || p.status === "On Hold"), [projects]);

  useEffect(() => {
    if (selectedId !== ALL_CONTRACTORS && !contractorsInScope.some((c) => c.id === selectedId)) {
      setSelectedId(ALL_CONTRACTORS);
    }
  }, [contractorsInScope, selectedId]);

  return (
    <Layout>
      <PageHeader
        title="Contractors"
        subtitle="Project-scoped contractors — entries and payments by month"
        printTargetId="contractors-content"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddContractorOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Contractor
            </Button>
            <Button variant="warning" size="sm" onClick={() => setAddEntryOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Entry
            </Button>
            {selectedContractor && (
              <Button variant="default" size="sm" onClick={() => setPaymentOpen(true)}>
                <Banknote className="h-4 w-4 mr-1" /> Record Payment
              </Button>
            )}
          </div>
        }
      />

      <AddContractorDialog
        open={addContractorOpen}
        onOpenChange={setAddContractorOpen}
        restrictedProjectId={isSiteManager ? currentUser?.assignedProjectId : undefined}
        restrictedProjectName={isSiteManager ? currentUser?.assignedProjectName : undefined}
      />
      <AddContractorEntryDialog
        open={addEntryOpen}
        onOpenChange={setAddEntryOpen}
        defaultContractorId={selectedContractor?.id}
        projectFilterName={
          isSiteManager
            ? projectFilterName ?? undefined
            : selectedProjectId !== ALL_PROJECTS
              ? projects.find((p) => p.id === selectedProjectId)?.name
              : undefined
        }
      />
      <ContractorPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        contractor={selectedContractor}
        remainingBalance={selectedContractor ? monthlyRemaining : undefined}
      />

      <div id="contractors-content" className="space-y-4">
        <div className="flex flex-wrap items-end gap-4 p-4 border-2 border-border">
          {!isSiteManager && (
            <div className="min-w-[200px]">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project</Label>
              <Select
                value={selectedProjectId}
                onValueChange={(v) => {
                  setSelectedProjectId(v);
                  setSelectedId(ALL_CONTRACTORS);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PROJECTS}>All Projects</SelectItem>
                  {projectsForSelector.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {isSiteManager && projectFilterName && (
            <div className="min-w-[200px]">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project</Label>
              <p className="mt-1.5 text-sm font-medium">{projectFilterName}</p>
              <p className="text-xs text-muted-foreground">Your assigned project (Site Manager)</p>
            </div>
          )}
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contractor</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="Search contractors…"
                value={contractorSearch}
                onChange={(e) => setContractorSearch(e.target.value)}
                className="max-w-[180px]"
              />
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="flex-1 min-w-[180px]">
                  <SelectValue placeholder="All Contractors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CONTRACTORS}>All Contractors</SelectItem>
                  {filteredContractorsForDropdown.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.project}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Month</Label>
            <div className="flex items-center border-2 border-border">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-none"
                onClick={() => setCurrentMonth(prevMonth(currentMonth))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[140px] px-3 py-2 text-sm font-medium text-center">
                {getMonthLabel(currentMonth)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-none"
                onClick={() => setCurrentMonth(nextMonth(currentMonth))}
                disabled={!canGoNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Amount"
            value={formatCurrencyCompact(monthlyTotal)}
            title={formatCurrency(monthlyTotal)}
          />
          <StatCard
            label="Paid Amount"
            value={formatCurrencyCompact(monthlyPaid)}
            variant="success"
            title={formatCurrency(monthlyPaid)}
          />
          <StatCard
            label="Remaining Balance"
            value={formatCurrencyCompact(monthlyRemaining)}
            variant={monthlyRemaining > 0 ? "destructive" : "success"}
            title={formatCurrency(monthlyRemaining)}
          />
        </div>

        <div className="border-2 border-border">
          <div className="border-b-2 border-border bg-secondary px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Entries — {getMonthLabel(currentMonth)}
              {selectedContractor ? ` (${selectedContractor.name})` : ""}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                  {selectedId === ALL_CONTRACTORS && (
                    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Contractor</th>
                  )}
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {tableEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={selectedId === ALL_CONTRACTORS ? 4 : 3}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No entries for this month{selectedContractor ? ` for ${selectedContractor.name}` : ""}. Add an entry above.
                    </td>
                  </tr>
                ) : (
                  tableEntries.map((e) => (
                    <tr key={e.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                      {selectedId === ALL_CONTRACTORS && (
                        <td className="px-4 py-3">
                          <span className="font-bold">{e.contractorName}</span>
                          <p className="text-xs text-muted-foreground">{e.project}</p>
                        </td>
                      )}
                      <td className="px-4 py-3 text-xs">{e.date}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{formatCurrency(e.amount)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{e.remarks || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
