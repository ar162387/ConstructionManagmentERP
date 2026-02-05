import { Navigate } from 'react-router-dom';
import {
  Wallet,
  FolderKanban,
  TrendingUp,
  Users,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { mockTransactions, mockBankAccounts } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const cashFlowData = [
  { month: 'Jul', inflow: 1200000, outflow: 850000 },
  { month: 'Aug', inflow: 1500000, outflow: 920000 },
  { month: 'Sep', inflow: 1800000, outflow: 1100000 },
  { month: 'Oct', inflow: 2100000, outflow: 1300000 },
  { month: 'Nov', inflow: 1900000, outflow: 1450000 },
  { month: 'Dec', inflow: 2400000, outflow: 1200000 },
];

export default function Dashboard() {
  const { isAuthenticated, user } = useAuth();
  const { selectedProjectId, availableProjects } = useProject();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const projectsToShow =
    selectedProjectId != null
      ? availableProjects.filter((p) => p.id === selectedProjectId)
      : availableProjects;
  const totalBalance = mockBankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const activeProjects = projectsToShow.filter((p) => p.status === 'active').length;
  const totalBudget = projectsToShow.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = projectsToShow.reduce((sum, p) => sum + p.spent, 0);
  const recentTransactions =
    selectedProjectId != null
      ? mockTransactions.filter((t) => t.projectId === selectedProjectId)
      : mockTransactions;
  const projectsForCards = projectsToShow.filter((p) => p.status === 'active');

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `Rs ${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `Rs ${(amount / 100000).toFixed(2)} L`;
    }
    return `Rs ${(amount / 1000).toFixed(0)}K`;
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with your projects today.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            Last updated: {new Date().toLocaleDateString()}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Balance"
            value={formatCurrency(totalBalance)}
            subtitle="Across all accounts"
            icon={<Wallet className="h-6 w-6" />}
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatsCard
            title="Active Projects"
            value={activeProjects}
            subtitle={`${projectsToShow.length} total projects`}
            icon={<FolderKanban className="h-6 w-6" />}
          />
          <StatsCard
            title="Allocated Budget"
            value={formatCurrency(totalBudget)}
            subtitle="Total across projects"
            icon={<DollarSign className="h-6 w-6" />}
          />
          <StatsCard
            title="Utilized Budget"
            value={formatCurrency(totalSpent)}
            subtitle="Aggregated from expenses"
            icon={<TrendingUp className="h-6 w-6" />}
          />
          <StatsCard
            title="Pending Payables"
            value={formatCurrency(650000)}
            subtitle="Due this month"
            icon={<AlertTriangle className="h-6 w-6" />}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Cash Flow Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Cash Flow Overview</CardTitle>
              <Badge variant="outline">Last 6 months</Badge>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowData}>
                    <defs>
                      <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis
                      tickFormatter={(value) => `Rs ${(value / 10000000).toFixed(1)}Cr`}
                      className="text-xs"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [
                        `Rs ${(value / 10000000).toFixed(2)} Cr`,
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="inflow"
                      stroke="hsl(var(--chart-1))"
                      fillOpacity={1}
                      fill="url(#colorInflow)"
                      name="Inflow"
                    />
                    <Area
                      type="monotone"
                      dataKey="outflow"
                      stroke="hsl(var(--chart-4))"
                      fillOpacity={1}
                      fill="url(#colorOutflow)"
                      name="Outflow"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <RecentTransactions transactions={recentTransactions} />
        </div>

        {/* Active Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Active Projects</h2>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
              View All
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projectsForCards.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
