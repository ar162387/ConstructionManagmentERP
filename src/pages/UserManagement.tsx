import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { useMockStore } from "@/context/MockStore";

export default function UserManagement() {
  const { state } = useMockStore();
  const users = state.users;

  return (
    <Layout>
      <PageHeader
        title="User Management"
        subtitle="Super Admin only — Create/manage users and system policies"
        printTargetId="users-table"
      />
      <div id="users-table" className="border-2 border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Email</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Role</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Assigned Project</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 font-bold">{u.name}</td>
                  <td className="px-4 py-3 text-xs font-mono">{u.email}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.role} /></td>
                  <td className="px-4 py-3 text-xs">{u.assignedProjectName || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t-2 border-border bg-secondary px-4 py-3">
          <p className="text-xs text-muted-foreground">
            <strong>System policy toggles (prototype):</strong> “Admin cannot delete”, “Admin cannot edit financial records” — to be wired in backend.
          </p>
        </div>
      </div>
    </Layout>
  );
}
