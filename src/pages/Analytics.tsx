import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { mockBankAccounts } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  LineChart,
  Line,
  Legend,
} from 'recharts';

const monthlyData = [
  { month: 'Jul', revenue: 2800000, expenses: 2100000 },
  { month: 'Aug', revenue: 3200000, expenses: 2400000 },
  { month: 'Sep', revenue: 2900000, expenses: 2200000 },
  { month: 'Oct', revenue: 3500000, expenses: 2600000 },
  { month: 'Nov', revenue: 3800000, expenses: 2900000 },
  { month: 'Dec', revenue: 4200000, expenses: 3100000 },
];

const expenseBreakdown = [
  { name: 'Materials', value: 45, color: 'hsl(var(--chart-1))' },
  { name: 'Labor', value: 30, color: 'hsl(var(--chart-2))' },
  { name: 'Equipment', value: 15, color: 'hsl(var(--chart-3))' },
  { name: 'Overhead', value: 10, color: 'hsl(var(--chart-4))' },
];

export default function Analytics() {
  const { isAuthenticated } = useAuth();
  const { availableProjects } = useProject();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  const projectPerformance = availableProjects.map((project) => ({
    name: project.name.split(' ')[0],
    budget: project.budget / 1000000,
    spent: project.spent / 1000000,
  }));

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics & Reports</h1>
            <p className="text-muted-foreground">
              Cross-project financial insights and performance metrics
            </p>
          </div>
          <Badge variant="outline">Last updated: {new Date().toLocaleDateString()}</Badge>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue vs Expenses */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Revenue vs Expenses (6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value)}
                      className="text-xs"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatCurrency(value)]}
                    />
                    <Legend />
                    <Bar
                      dataKey="revenue"
                      fill="hsl(var(--chart-1))"
                      name="Revenue"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="expenses"
                      fill="hsl(var(--chart-4))"
                      name="Expenses"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value}%`]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Project Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Project Budget Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(value) => `$${value}M`} />
                    <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`$${value}M`]}
                    />
                    <Legend />
                    <Bar
                      dataKey="budget"
                      fill="hsl(var(--chart-3))"
                      name="Budget"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="spent"
                      fill="hsl(var(--chart-2))"
                      name="Spent"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Balances */}
        <Card>
          <CardHeader>
            <CardTitle>Account Balances Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {mockBankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-muted-foreground">{account.bankName}</p>
                  </div>
                  <p className="text-xl font-bold">{formatCurrency(account.balance)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
