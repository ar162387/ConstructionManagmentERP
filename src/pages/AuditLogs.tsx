import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { listAuditLogs, type ApiAuditLog } from "@/services/auditLogsService";
import { TablePagination } from "@/components/TablePagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [12, 24, 50, 100];
const DEFAULT_PAGE_SIZE = 12;

export default function AuditLogs() {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const fetchLogs = useCallback(async () => {
    try {
      const params: { module?: string; action?: string; page: number; pageSize: number } = {
        page,
        pageSize,
      };
      if (moduleFilter !== "all") params.module = moduleFilter;
      if (actionFilter !== "all") params.action = actionFilter;
      const res = await listAuditLogs(params);
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [moduleFilter, actionFilter, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [moduleFilter, actionFilter]);

  useEffect(() => {
    setLoading(true);
    fetchLogs();
  }, [fetchLogs]);

  const modules = Array.from(new Set(logs.map((l) => l.module)));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndexOneBased = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return (
    <Layout>
      <PageHeader
        title="Audit Logs"
        subtitle="System-wide activity trail — Super Admin access"
        printTargetId="audit-table"
      />
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Module</Label>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="mt-1 w-[180px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              {modules.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Action</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="mt-1 w-[140px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Edit</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div id="audit-table" className="border-2 border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">User</th>
                <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Role</th>
                <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Action</th>
                <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Module</th>
                <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Description</th>
                <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Changes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono">{log.timestamp}</td>
                    <td className="px-4 py-3 text-sm">{log.user}</td>
                    <td className="px-4 py-3 text-sm uppercase text-muted-foreground">{log.role}</td>
                    <td className="px-4 py-3"><StatusBadge status={log.action} /></td>
                    <td className="px-4 py-3 text-sm font-bold">{log.module}</td>
                    <td className="px-4 py-3 text-sm">{log.description}</td>
                    <td className="px-4 py-3 text-sm">
                      {log.oldValue && log.newValue && (
                        <span>
                          <span className="text-destructive line-through">{log.oldValue}</span>
                          {" → "}
                          <span className="text-success">{log.newValue}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && logs.length > 0 && (
          <TablePagination
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            page={page}
            totalPages={totalPages}
            totalItems={total}
            onPrevious={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            canPrevious={page > 1}
            canNext={page < totalPages}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            startIndexOneBased={startIndexOneBased}
            endIndex={endIndex}
          />
        )}
      </div>
    </Layout>
  );
}
