import { Navigate, useParams } from 'react-router-dom';
import {
  Users,
  DollarSign,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { mockTransactions } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ProjectDashboard() {
  const { isAuthenticated } = useAuth();
  const { availableProjects } = useProject();
  const { projectId } = useParams<{ projectId: string }>();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const project = projectId
    ? availableProjects.find((p) => p.id === projectId)
    : null;

  if (!project) {
    return (
      <AppLayout>
        <div className="p-6">
          <p className="text-muted-foreground">Project not found or you do not have access.</p>
          <Button variant="link" className="mt-2 pl-0" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Projects
          </Button>
        </div>
      </AppLayout>
    );
  }

  const projectPersonnel = project.siteManagers ?? [];
  const projectExpenses = mockTransactions.filter(
    (t) => t.type === 'outflow' && t.projectId === project.id
  );
  const totalExpenses = projectExpenses.reduce((sum, e) => sum + e.amount, 0);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `Rs ${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(2)} L`;
    return `Rs ${(amount / 1000).toFixed(0)}K`;
  };

  const statusStyles = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <p className="text-muted-foreground">{project.description}</p>
              <Badge className={cn('mt-2', statusStyles[project.status])}>
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Allocated Budget
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(project.budget)}</div>
              <p className="text-xs text-muted-foreground">Planning estimate</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Utilized Budget
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(project.spent)}
              </div>
              <p className="text-xs text-muted-foreground">Aggregated from expenses</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Personnel
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectPersonnel.length}</div>
              <p className="text-xs text-muted-foreground">Site managers assigned</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{format(project.startDate, 'MMM d, yyyy')}</span>
          {project.endDate && (
            <span>End: {format(project.endDate, 'MMM d, yyyy')}</span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Project Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {projectExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {projectExpenses.slice(0, 5).map((exp) => (
                    <li
                      key={exp.id}
                      className="flex justify-between text-sm border-b border-border pb-2 last:border-0"
                    >
                      <span className="truncate">{exp.description}</span>
                      <span className="font-medium text-destructive whitespace-nowrap">
                        -{formatCurrency(exp.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Personnel on Project</CardTitle>
            </CardHeader>
            <CardContent>
              {projectPersonnel.length === 0 ? (
                <p className="text-sm text-muted-foreground">No site managers assigned yet.</p>
              ) : (
                <ul className="space-y-2">
                  {projectPersonnel.map((person) => (
                    <li
                      key={person.id}
                      className="flex justify-between text-sm border-b border-border pb-2 last:border-0"
                    >
                      <span>{person.name}</span>
                      <Badge variant="outline">{person.role}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
