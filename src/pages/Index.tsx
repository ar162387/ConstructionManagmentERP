import { useMemo, useState, useEffect } from "react";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { ChartCard } from "@/components/charts/ChartCard";
import { formatCurrency } from "@/lib/mock-data";
import { useAuth } from "@/context/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { useExpenses } from "@/hooks/useExpenses";
import { useVendors } from "@/hooks/useVendors";
import { useEmployees } from "@/hooks/useEmployees";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { getProjectSummary } from "@/services/projectsService";
import type { ApiProjectSummary } from "@/services/projectsService";
import { FolderKanban, Package, Users, AlertTriangle, Banknote, HardHat, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const LIABILITY_COLORS = ["hsl(var(--destructive))", "hsl(var(--warning))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

export default function Index() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const isSiteManager = user?.role === "Site Manager";
  const assignedProjectId = user?.assignedProjectId ?? null;
  const { vendors } = useVendors(isSiteManager ? assignedProjectId : undefined);
  const { employees } = useEmployees(isSiteManager ? assignedProjectId : undefined);
  const { accounts: bankAccounts } = useBankAccounts();

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "Active"),
    [projects]
  );
  const activeProjectIds = useMemo(
    () => new Set(activeProjects.map((p) => p.id)),
    [activeProjects]
  );
  const activeProjectIdsStr = useMemo(
    () => activeProjects.map((p) => p.id).sort().join(","),
    [activeProjects]
  );
  const allProjectIdsStr = useMemo(
    () => projects.map((p) => p.id).sort().join(","),
    [projects]
  );

  const [summaries, setSummaries] = useState<Record<string, ApiProjectSummary>>({});
  const [summariesLoading, setSummariesLoading] = useState(false);

  useEffect(() => {
    const ids = allProjectIdsStr ? allProjectIdsStr.split(",").filter(Boolean) : [];
    if (ids.length === 0) {
      setSummaries({});
      return;
    }
    let cancelled = false;
    setSummariesLoading(true);
    Promise.all(ids.map((id) => getProjectSummary(id)))
      .then((results) => {
        if (cancelled) return;
        const next: Record<string, ApiProjectSummary> = {};
        ids.forEach((id, i) => {
          next[id] = results[i];
        });
        setSummaries(next);
      })
      .catch(() => {
        if (!cancelled) setSummaries({});
      })
      .finally(() => {
        if (!cancelled) setSummariesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allProjectIdsStr]);

  const { expenses } = useExpenses({
    projectId: isSiteManager ? assignedProjectId : undefined,
    page: 1,
    pageSize: 10000,
  });

  const activeExpenses = useMemo(
    () => (isSiteManager ? expenses : expenses.filter((e) => activeProjectIds.has(e.projectId))),
    [expenses, activeProjectIds, isSiteManager]
  );

  const totals = useMemo(() => {
    let totalSpent = 0;
    let totalLiabilities = 0;
    let totalVendorDues = 0;
    let totalContractorDues = 0;
    let totalSalaryDues = 0;
    let totalMachineryDues = 0;
    activeProjects.forEach((p) => {
      const s = summaries[p.id];
      if (!s) return;
      totalSpent += s.spent;
      totalLiabilities += s.liabilities;
      totalVendorDues += s.breakdown?.vendor.liabilities ?? 0;
      totalContractorDues += s.breakdown?.contractor.liabilities ?? 0;
      totalSalaryDues += s.breakdown?.employee.liabilities ?? 0;
      totalMachineryDues += s.breakdown?.machinery.liabilities ?? 0;
    });
    return {
      totalSpent,
      totalLiabilities,
      totalVendorDues,
      totalContractorDues,
      totalSalaryDues,
      totalMachineryDues,
    };
  }, [activeProjects, summaries]);

  const spentVsBalanceData = useMemo(
    () =>
      activeProjects.map((p) => {
        const s = summaries[p.id];
        const spent = s?.spent ?? 0;
        const balance = p.balance ?? 0;
        return {
          name: p.name.length > 14 ? p.name.slice(0, 12) + "…" : p.name,
          fullName: p.name,
          Spent: spent,
          Balance: balance,
        };
      }),
    [activeProjects, summaries]
  );

  const liabilityBreakdownData = useMemo(() => {
    const { totalVendorDues, totalContractorDues, totalSalaryDues, totalMachineryDues } = totals;
    const total = totalVendorDues + totalContractorDues + totalSalaryDues + totalMachineryDues;
    if (total === 0) return [];
    return [
      { name: "Vendor Dues", value: totalVendorDues, amount: totalVendorDues },
      { name: "Contractor Dues", value: totalContractorDues, amount: totalContractorDues },
      { name: "Salary Dues", value: totalSalaryDues, amount: totalSalaryDues },
      { name: "Machinery Dues", value: totalMachineryDues, amount: totalMachineryDues },
    ].filter((d) => d.value > 0);
  }, [totals]);

  const expenseByCategoryData = useMemo(() => {
    const byCat: Record<string, number> = {};
    activeExpenses.forEach((e) => {
      byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    });
    return Object.entries(byCat).map(([name, amount]) => ({
      name,
      amount,
      fill: CHART_COLORS[Object.keys(byCat).indexOf(name) % CHART_COLORS.length],
    }));
  }, [activeExpenses]);

  const formatTooltip = (value: number) => formatCurrency(value);

  const projectsWithSummary = useMemo(
    () =>
      projects.map((p) => {
        const s = summaries[p.id];
        return {
          ...p,
          spent: s?.spent ?? p.spent ?? 0,
          liabilities: s?.liabilities ?? 0,
          balance: p.balance ?? 0,
        };
      }),
    [projects, summaries]
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Company-wide overview (active projects)</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 auto-rows-fr">
          <StatCard
            label="Active Projects"
            value={summariesLoading ? "…" : String(activeProjects.length)}
            icon={<FolderKanban className="h-4 w-4" />}
            variant="info"
            numeric
          />
          <StatCard
            label="Spent"
            value={summariesLoading ? "…" : totals.totalSpent.toLocaleString("en-PK")}
            icon={<Package className="h-4 w-4" />}
            variant="warning"
            numeric
          />
          <StatCard
            label="Liabilities"
            value={summariesLoading ? "…" : totals.totalLiabilities.toLocaleString("en-PK")}
            icon={<AlertTriangle className="h-4 w-4" />}
            variant="destructive"
            numeric
          />
          <StatCard
            label="Vendor Dues"
            value={summariesLoading ? "…" : totals.totalVendorDues.toLocaleString("en-PK")}
            icon={<Banknote className="h-4 w-4" />}
            variant="destructive"
            numeric
          />
          <StatCard
            label="Contractor Dues"
            value={summariesLoading ? "…" : totals.totalContractorDues.toLocaleString("en-PK")}
            icon={<HardHat className="h-4 w-4" />}
            variant="destructive"
            numeric
          />
          <StatCard
            label="Salary Dues"
            value={summariesLoading ? "…" : totals.totalSalaryDues.toLocaleString("en-PK")}
            icon={<Users className="h-4 w-4" />}
            variant="warning"
            numeric
          />
          <StatCard
            label="Machinery Dues"
            value={summariesLoading ? "…" : totals.totalMachineryDues.toLocaleString("en-PK")}
            icon={<Wrench className="h-4 w-4" />}
            variant="warning"
            numeric
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <ChartCard title="Spent vs Project Balance" subtitle="Spent and balance per active project">
            {spentVsBalanceData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active projects</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={spentVsBalanceData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => v.toLocaleString("en-PK")} className="text-xs" />
                  <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={formatTooltip} contentStyle={{ fontSize: 12 }} labelFormatter={(_, payload) => payload[0]?.payload?.fullName} />
                  <Legend />
                  <Bar dataKey="Spent" fill="hsl(var(--warning))" name="Spent" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="Balance" fill="hsl(var(--chart-2))" name="Balance" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Liability Breakdown" subtitle="Aggregated liabilities from all active projects" noContentPadding>
            {liabilityBreakdownData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8">No outstanding liabilities</p>
            ) : (
              <div className="w-full h-full min-h-[240px] aspect-[4/3] max-h-[340px] overflow-visible">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 44 }}>
                    <Pie
                      data={liabilityBreakdownData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius="40%"
                      outerRadius="65%"
                      paddingAngle={2}
                    >
                      {liabilityBreakdownData.map((_, i) => (
                        <Cell key={i} fill={LIABILITY_COLORS[i % LIABILITY_COLORS.length]} stroke="hsl(var(--border))" strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12 }} />
                    <Legend
                      layout="horizontal"
                      align="center"
                      verticalAlign="bottom"
                      wrapperStyle={{ paddingTop: 8 }}
                      formatter={(value, entry: { payload?: { value?: number } }) => {
                        const totalL = liabilityBreakdownData.reduce((s, d) => s + d.value, 0);
                        const val = entry?.payload?.value ?? 0;
                        const pct = totalL > 0 ? (100 * val / totalL).toFixed(0) : "0";
                        return <span className="text-xs">{value} ({pct}%)</span>;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
          <ChartCard title="Expenses by Category" subtitle="Total expenses from all active projects">
            {expenseByCategoryData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expense data</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={expenseByCategoryData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => v.toLocaleString("en-PK")} className="text-xs" />
                  <Tooltip formatter={formatTooltip} />
                  <Bar dataKey="amount" name="Amount" radius={[2, 2, 0, 0]} fill="hsl(var(--chart-1))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Projects Overview */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold leading-none tracking-tight">Projects Overview</h2>
            <Link to="/projects" className="text-sm font-medium text-primary hover:underline">
              View All &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider">Project</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground uppercase tracking-wider">Spent</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground uppercase tracking-wider">Liabilities</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground uppercase tracking-wider">Balance</th>
                </tr>
              </thead>
              <tbody>
                {projectsWithSummary.map((project) => (
                  <tr key={project.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors last:border-0">
                    <td className="px-6 py-4">
                      <Link to="/projects" className="font-medium hover:underline">{project.name}</Link>
                      <p className="text-xs text-muted-foreground mt-0.5">{project.description}</p>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={project.status} /></td>
                    <td className="px-6 py-4 text-right tabular-nums text-sm">{formatCurrency(project.spent)}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-sm text-destructive">{formatCurrency(project.liabilities)}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-sm font-medium">{formatCurrency(project.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Vendors", path: "/vendors", count: vendors.length },
            { label: "Employees", path: "/employees", count: employees.length },
            { label: "Bank Accounts", path: "/bank-accounts", count: bankAccounts.length },
            { label: "Audit Logs", path: "/audit-logs", count: "View" },
          ].map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="rounded-xl border bg-card p-5 hover:bg-accent/50 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
            >
              <p className="text-sm font-medium text-muted-foreground">{link.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{link.count}</p>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
