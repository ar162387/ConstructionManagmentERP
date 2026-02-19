import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { formatCurrency } from "@/lib/mock-data";
import { useMockStore } from "@/context/MockStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const LIABILITY_PIE_COLORS = ["hsl(var(--destructive))", "hsl(var(--warning))", "hsl(var(--chart-3))"];

export default function Liabilities() {
  const { state } = useMockStore();
  const { vendors, employees, machines } = state;
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const vendorDues = useMemo(() => vendors.reduce((s, v) => s + v.remaining, 0), [vendors]);
  const salaryDues = useMemo(() => employees.reduce((s, e) => s + e.totalDue, 0), [employees]);
  const machineryDues = useMemo(() => machines.reduce((s, m) => s + m.totalPending, 0), [machines]);
  const totalLiabilities = vendorDues + salaryDues + machineryDues;

  const liabilityBreakdownData = useMemo(() => {
    if (totalLiabilities === 0) return [];
    return [
      { name: "Vendor Dues", value: vendorDues, amount: vendorDues },
      { name: "Salary Dues", value: salaryDues, amount: salaryDues },
      { name: "Machinery Dues", value: machineryDues, amount: machineryDues },
    ].filter((d) => d.value > 0);
  }, [totalLiabilities, vendorDues, salaryDues, machineryDues]);

  const topEntitiesData = useMemo(() => {
    const items: { name: string; pending: number; type: string }[] = [];
    vendors
      .filter((v) => v.remaining > 0)
      .forEach((v) => items.push({ name: v.name.length > 18 ? v.name.slice(0, 16) + "…" : v.name, pending: v.remaining, type: "Vendor" }));
    employees
      .filter((e) => e.totalDue > 0)
      .forEach((e) => items.push({ name: e.name.length > 18 ? e.name.slice(0, 16) + "…" : e.name, pending: e.totalDue, type: "Employee" }));
    machines
      .filter((m) => m.totalPending > 0)
      .forEach((m) => items.push({ name: m.name.length > 18 ? m.name.slice(0, 16) + "…" : m.name, pending: m.totalPending, type: "Machinery" }));
    return items.sort((a, b) => b.pending - a.pending).slice(0, 10);
  }, [vendors, employees, machines]);

  const filteredVendors = entityFilter === "all" || entityFilter === "vendor" ? vendors.filter((v) => v.remaining > 0) : [];
  const filteredEmployees = entityFilter === "all" || entityFilter === "employee" ? employees.filter((e) => e.totalDue > 0) : [];
  const filteredMachines = entityFilter === "all" || entityFilter === "machinery" ? machines.filter((m) => m.totalPending > 0) : [];

  return (
    <Layout>
      <PageHeader
        title="Liabilities"
        subtitle="Outstanding payments & dues across all entities"
        printTargetId="liabilities-content"
      />

      <div className="flex flex-wrap items-end gap-4 mb-6 p-4 border-2 border-border">
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Entity</Label>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="mt-1 w-[180px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              <SelectItem value="vendor">Vendors only</SelectItem>
              <SelectItem value="employee">Employees only</SelectItem>
              <SelectItem value="machinery">Machinery only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date from</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 w-[140px]" />
        </div>
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date to</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 w-[140px]" />
        </div>
      </div>

      <div id="liabilities-content" className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Liabilities" value={formatCurrency(totalLiabilities)} variant="destructive" />
          <StatCard label="Vendor Dues" value={formatCurrency(vendorDues)} variant="warning" />
          <StatCard label="Salary Dues" value={formatCurrency(salaryDues)} variant="warning" />
          <StatCard label="Machinery Dues" value={formatCurrency(machineryDues)} variant="warning" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Liability Mix" subtitle="Share of total outstanding by category">
            {liabilityBreakdownData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outstanding liabilities</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={liabilityBreakdownData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {liabilityBreakdownData.map((_, i) => (
                      <Cell key={i} fill={LIABILITY_PIE_COLORS[i % LIABILITY_PIE_COLORS.length]} stroke="hsl(var(--border))" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Top 10 by Pending Amount" subtitle="Entities with highest dues">
            {topEntitiesData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending dues</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topEntitiesData} margin={{ top: 8, right: 8, left: 0, bottom: 60 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => (v >= 1e7 ? `${(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `${(v / 1e5).toFixed(1)}L` : `${(v / 1e3).toFixed(0)}K`)} className="text-xs" />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="pending" name="Pending" radius={[0, 2, 2, 0]} fill="hsl(var(--destructive) / 0.85)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Vendor Dues */}
        <div className="border-2 border-border">
          <div className="border-b-2 border-border bg-secondary px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wider">Vendor Pending Payments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Vendor</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Billed</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Paid</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Pending</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((v) => (
                  <tr key={v.id} className="border-b border-border hover:bg-accent/50">
                    <td className="px-4 py-3 font-bold">{v.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatCurrency(v.totalBilled)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-success">{formatCurrency(v.totalPaid)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-destructive font-bold">{formatCurrency(v.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Salary Dues */}
        <div className="border-2 border-border">
          <div className="border-b-2 border-border bg-secondary px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wider">Salary Dues</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Project</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Total Paid</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Due</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((e) => (
                  <tr key={e.id} className="border-b border-border hover:bg-accent/50">
                    <td className="px-4 py-3 font-bold">{e.name}</td>
                    <td className="px-4 py-3 text-xs">{e.project}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatCurrency(e.totalPaid)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-destructive font-bold">{formatCurrency(e.totalDue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Machinery Dues */}
        <div className="border-2 border-border">
          <div className="border-b-2 border-border bg-secondary px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wider">Machinery Pending Payments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Machine</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Total Cost</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Paid</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Pending</th>
                </tr>
              </thead>
              <tbody>
                {filteredMachines.map((m) => (
                  <tr key={m.id} className="border-b border-border hover:bg-accent/50">
                    <td className="px-4 py-3 font-bold">{m.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatCurrency(m.totalCost)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-success">{formatCurrency(m.totalPaid)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-destructive font-bold">{formatCurrency(m.totalPending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
