import { useState } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { useMockStore } from "@/context/MockStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function AuditLogs() {
  const { state } = useMockStore();
  const auditLogs = state.auditLogs;
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const filtered = auditLogs.filter((log) => {
    if (moduleFilter !== "all" && log.module !== moduleFilter) return false;
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    return true;
  });
  const modules = Array.from(new Set(auditLogs.map((l) => l.module)));

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
              <SelectItem value="Create">Create</SelectItem>
              <SelectItem value="Edit">Edit</SelectItem>
              <SelectItem value="Delete">Delete</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div id="audit-table" className="border-2 border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">User</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Role</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Action</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Module</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Description</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Changes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono">{log.timestamp}</td>
                  <td className="px-4 py-3 text-xs">{log.user}</td>
                  <td className="px-4 py-3 text-xs uppercase text-muted-foreground">{log.role}</td>
                  <td className="px-4 py-3"><StatusBadge status={log.action} /></td>
                  <td className="px-4 py-3 text-xs font-bold">{log.module}</td>
                  <td className="px-4 py-3 text-xs">{log.description}</td>
                  <td className="px-4 py-3 text-xs">
                    {log.oldValue && (
                      <span>
                        <span className="text-destructive line-through">{log.oldValue}</span>
                        {" → "}
                        <span className="text-success">{log.newValue}</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
