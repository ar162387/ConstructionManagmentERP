import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Search, Filter, Clock, User, Database, Settings, Loader2, X, Download } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuditLogDisplay } from '@/components/audit/AuditLogDisplay';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAuditLogs,
  getAuditLogFilterOptions,
  type AuditLogFilters,
} from '@/services/auditLogService';
import type { AuditLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const actionStyles: Record<string, string> = {
  create: 'bg-accent text-accent-foreground',
  update: 'bg-primary/20 text-primary',
  delete: 'bg-destructive/20 text-destructive',
  login: 'bg-muted text-muted-foreground',
  logout: 'bg-muted text-muted-foreground',
  status_change: 'bg-primary/20 text-primary',
};

const actionIcons: Record<string, typeof Database> = {
  create: Database,
  update: Settings,
  delete: Database,
  login: User,
  logout: User,
  status_change: Settings,
};

export default function AuditLogs() {
  const { isAuthenticated, user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [filterOptions, setFilterOptions] = useState<{ users: { id: string; name: string; email: string }[]; targetTypes: string[] }>({
    users: [],
    targetTypes: [],
  });
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const logsRes = await getAuditLogs(filters);
        setLogs(logsRes.logs);
        setMeta(logsRes.meta);
      } catch {
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [filters]);

  useEffect(() => {
    getAuditLogFilterOptions()
      .then(setFilterOptions)
      .catch(() => { });
  }, []);

  const handleSearch = () => {
    setFilters((f) => ({ ...f, search: searchInput.trim() || undefined, page: 1 }));
  };

  const handleFilterAction = (action: string) => {
    setFilters((f) => ({ ...f, action: action === 'all' ? undefined : action, page: 1 }));
  };

  const handleFilterUser = (userId: string) => {
    setFilters((f) => ({ ...f, userId: userId === 'all' ? undefined : userId, page: 1 }));
  };

  const handleFilterTargetType = (targetType: string) => {
    setFilters((f) => ({ ...f, targetType: targetType === 'all' ? undefined : targetType, page: 1 }));
  };

  const handleDateFromChange = (value: string) => {
    setFilters((f) => ({ ...f, dateFrom: value || undefined, page: 1 }));
  };

  const handleDateToChange = (value: string) => {
    setFilters((f) => ({ ...f, dateTo: value || undefined, page: 1 }));
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({});
  };

  const hasActiveFilters =
    filters.search || filters.action || filters.userId || filters.targetType || filters.dateFrom || filters.dateTo;

  const handleExportLogs = async () => {
    try {
      // Fetch all logs matching current filters (limit to 10000 to be safe)
      const res = await getAuditLogs({ ...filters, page: 1, per_page: 10000 });
      const allLogs = res.logs;

      if (allLogs.length === 0) {
        // toast({ title: 'No logs', description: 'No logs to export.', variant: 'default' });
        return;
      }

      // Convert to CSV
      const headers = ['Timestamp', 'User', 'Action', 'Module', 'Details', 'Before Data', 'After Data'];
      const rows = allLogs.map((log) => [
        format(log.timestamp, 'yyyy-MM-dd HH:mm:ss'),
        log.userName,
        log.action,
        log.module,
        log.details,
        log.beforeData ? JSON.stringify(log.beforeData).replace(/"/g, '""') : '',
        log.afterData ? JSON.stringify(log.afterData).replace(/"/g, '""') : '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((field) => `"${field}"`).join(',')),
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export logs', err);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground">
              Track all user actions and system changes
            </p>
          </div>
          <Button variant="outline" className="w-fit gap-2" onClick={handleExportLogs}>
            <Download className="h-4 w-4" />
            Export Logs
          </Button>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter by User, Action, Module & Details</CardTitle>
            <p className="text-sm text-muted-foreground">
              Type in search or use the dropdowns to filter audit logs
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="audit-search">Search (user, details, module)</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="audit-search"
                    type="search"
                    placeholder="Search audit logs..."
                    className="pl-9"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={filters.userId ?? 'all'} onValueChange={handleFilterUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {filterOptions.users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={filters.action ?? 'all'} onValueChange={handleFilterAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="logout">Logout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Module / Target</Label>
                <Select value={filters.targetType ?? 'all'} onValueChange={handleFilterTargetType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All modules" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All modules</SelectItem>
                    {filterOptions.targetTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-from">Date from</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom ?? ''}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-to">Date to</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo ?? ''}
                  onChange={(e) => handleDateToChange(e.target.value)}
                />
              </div>
              <Button onClick={handleSearch} className="gap-2">
                <Filter className="h-4 w-4" />
                Apply Search
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audit Log List */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No audit logs found.
              </div>
            ) : (
              logs.map((log) => {
                const ActionIcon = actionIcons[log.action] ?? Database;
                const style = actionStyles[log.action] ?? 'bg-muted text-muted-foreground';
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        style
                      )}
                    >
                      <ActionIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{log.userName}</span>
                        <Badge variant="outline" className={cn('capitalize', style)}>
                          {log.action}
                        </Badge>
                        {log.module && (
                          <Badge variant="outline">{log.module}</Badge>
                        )}
                      </div>
                      <AuditLogDisplay log={log} />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      <Clock className="h-3 w-3" />
                      {format(log.timestamp, 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                );
              })
            )}

            {/* Pagination */}
            {meta.last_page > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {meta.current_page} of {meta.last_page} ({meta.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.current_page <= 1}
                    onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
