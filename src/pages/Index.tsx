import { useMemo } from "react";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { ChartCard } from "@/components/charts/ChartCard";
import { formatCurrency, formatCurrencyCompact } from "@/lib/mock-data";
import { useMockStore } from "@/context/MockStore";
import { useAuth } from "@/context/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { useVendors } from "@/hooks/useVendors";
import { useEmployees } from "@/hooks/useEmployees";
import { useExpenses } from "@/hooks/useExpenses";
import { useMachines } from "@/hooks/useMachines";
import { FolderKanban, Package, Users, Building2, AlertTriangle, TrendingUp } from "lucide-react";
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
const LIABILITY_COLORS = ["hsl(var(--destructive))", "hsl(var(--warning))", "hsl(var(--chart-3))"];

export default function Index() {
  const { user } = useAuth();
  const { state } = useMockStore();
  const { projects } = useProjects();
  const { vendors } = useVendors();
  const { employees } = useEmployees();
  const isSiteManager = user?.role === "Site Manager";
  const assignedProjectId = user?.assignedProjectId ?? null;
  const { expenses } = useExpenses({
    projectId: isSiteManager ? assignedProjectId : undefined,
    page: 1,
    pageSize: 1000,
  });
  const { machines } = useMachines(isSiteManager ? assignedProjectId : null, 1, 500);
  const { bankAccounts } = state;
  const activeProjects = projects.filter((p) => p.status === "Active").length;
  const totalBudget = projects.reduce((s, p) => s + p.allocatedBudget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const totalVendorDues = vendors.reduce((s, v) => s + v.remaining, 0);
  const totalEmpDues = employees.reduce((s, e) => s + (e.totalDue ?? 0), 0);
  const totalBankBalance = bankAccounts.reduce((s, b) => s + b.currentBalance, 0);
  const machineryDues = machines.reduce((s, m) => s + m.totalPending, 0);

  const budgetVsSpentData = useMemo(
    () =>
      projects.map((p) => ({
        name: p.name.length > 14 ? p.name.slice(0, 12) + "…" : p.name,
        fullName: p.name,
        Budget: p.allocatedBudget,
        Spent: p.spent,
        Remaining: Math.max(0, p.allocatedBudget - p.spent),
      })),
    [projects]
  );

  const liabilityBreakdownData = useMemo(() => {
    const total = totalVendorDues + totalEmpDues + machineryDues;
    if (total === 0) return [];
    return [
      { name: "Vendor Dues", value: totalVendorDues, amount: totalVendorDues },
      { name: "Salary Dues", value: totalEmpDues, amount: totalEmpDues },
      { name: "Machinery Dues", value: machineryDues, amount: machineryDues },
    ].filter((d) => d.value > 0);
  }, [totalVendorDues, totalEmpDues, machineryDues]);

  const expenseByCategoryData = useMemo(() => {
    const byCat: Record<string, number> = {};
    expenses.forEach((e) => {
      byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    });
    return Object.entries(byCat).map(([name, amount]) => ({ name, amount, fill: CHART_COLORS[Object.keys(byCat).indexOf(name) % CHART_COLORS.length] }));
  }, [expenses]);

  const formatTooltip = (value: number) => formatCurrency(value);

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Company-wide overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Active Projects" value={String(activeProjects)} icon={<FolderKanban className="h-4 w-4" />} variant="info" />
          <StatCard label="Total Budget" value={formatCurrencyCompact(totalBudget)} icon={<TrendingUp className="h-4 w-4" />} title={formatCurrency(totalBudget)} />
          <StatCard label="Total Spent" value={formatCurrencyCompact(totalSpent)} icon={<Package className="h-4 w-4" />} variant="warning" title={formatCurrency(totalSpent)} />
          <StatCard label="Bank Balance" value={formatCurrencyCompact(totalBankBalance)} icon={<Building2 className="h-4 w-4" />} variant="success" title={formatCurrency(totalBankBalance)} />
          <StatCard label="Vendor Dues" value={formatCurrencyCompact(totalVendorDues)} icon={<AlertTriangle className="h-4 w-4" />} variant="destructive" title={formatCurrency(totalVendorDues)} />
          <StatCard label="Salary Dues" value={formatCurrencyCompact(totalEmpDues)} icon={<Users className="h-4 w-4" />} variant="warning" title={formatCurrency(totalEmpDues)} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <ChartCard title="Budget vs Spent by Project" subtitle="Allocated budget and actual spend">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={budgetVsSpentData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(v) => (v >= 1e7 ? `${(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `${(v / 1e5).toFixed(1)}L` : `${(v / 1e3).toFixed(0)}K`)} className="text-xs" />
                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} />
                <Tooltip formatter={formatTooltip} contentStyle={{ fontSize: 12 }} labelFormatter={(_, payload) => payload[0]?.payload?.fullName} />
                <Legend />
                <Bar dataKey="Spent" fill="hsl(var(--warning))" name="Spent" radius={[0, 2, 2, 0]} />
                <Bar dataKey="Remaining" fill="hsl(var(--muted-foreground) / 0.2)" name="Remaining" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Liability Breakdown" subtitle="Outstanding dues by category">
            {liabilityBreakdownData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outstanding liabilities</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={liabilityBreakdownData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={64}
                    outerRadius={100}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {liabilityBreakdownData.map((_, i) => (
                      <Cell key={i} fill={LIABILITY_COLORS[i % LIABILITY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Expenses by Category" subtitle="Spend by category (all projects)">
            {expenseByCategoryData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expense data</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={expenseByCategoryData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => (v >= 1e5 ? `${(v / 1e5).toFixed(1)}L` : `${(v / 1e3).toFixed(0)}K`)} className="text-xs" />
                  <Tooltip formatter={formatTooltip} />
                  <Bar dataKey="amount" name="Amount" radius={[2, 2, 0, 0]} fill="hsl(var(--chart-1))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Projects Table */}
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
                  <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground uppercase tracking-wider">Budget</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground uppercase tracking-wider">Spent</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground uppercase tracking-wider">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors last:border-0">
                    <td className="px-6 py-4">
                      <Link to={`/projects`} className="font-medium hover:underline">{project.name}</Link>
                      <p className="text-xs text-muted-foreground mt-0.5">{project.description}</p>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={project.status} /></td>
                    <td className="px-6 py-4 text-right tabular-nums text-sm">{formatCurrency(project.allocatedBudget)}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-sm">{formatCurrency(project.spent)}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-sm font-medium">{formatCurrency(project.allocatedBudget - project.spent)}</td>
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
