import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FolderKanban, Package, Wrench, Users, Building2,
  Receipt, Truck, HardHat, ClipboardList, BarChart3, Menu, X, ChevronDown, ChevronRight, UserCog
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  children?: { label: string; path: string }[];
}

const companyNavItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Bank & Accounts", path: "/bank-accounts", icon: <Building2 className="h-4 w-4" /> },
  { label: "User Management", path: "/users", icon: <UserCog className="h-4 w-4" /> },
  { label: "Audit Logs", path: "/audit-logs", icon: <ClipboardList className="h-4 w-4" /> },
];

const projectNavItems: NavItem[] = [
  { label: "Projects", path: "/projects", icon: <FolderKanban className="h-4 w-4" /> },
  {
    label: "Inventory", path: "/inventory", icon: <Package className="h-4 w-4" />,
    children: [
      { label: "Consumable", path: "/inventory/consumable" },
      { label: "Non-Consumable", path: "/inventory/non-consumable" },
    ],
  },
  { label: "Vendors", path: "/vendors", icon: <Truck className="h-4 w-4" /> },
  { label: "Contractors", path: "/contractors", icon: <HardHat className="h-4 w-4" /> },
  { label: "Employees", path: "/employees", icon: <Users className="h-4 w-4" /> },
  { label: "Expenses", path: "/expenses", icon: <Receipt className="h-4 w-4" /> },
  { label: "Machinery", path: "/machinery", icon: <Wrench className="h-4 w-4" /> },
  { label: "Liabilities", path: "/liabilities", icon: <BarChart3 className="h-4 w-4" /> },
];

const navGroups = [
  { title: "Company", items: companyNavItems },
  { title: "Project", items: projectNavItems },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Inventory"]);
  const location = useLocation();

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isChildActive = (item: NavItem) =>
    item.children?.some((c) => location.pathname === c.path);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r-2 border-border bg-sidebar flex flex-col transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b-2 border-border px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <HardHat className="h-6 w-6 text-warning" />
            <span className="text-lg font-bold uppercase tracking-wider">BuildERP</span>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
              {group.items.map((item) => (
                <div key={item.label}>
                  {item.children ? (
                    <>
                      <button
                        onClick={() => toggleExpand(item.label)}
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent",
                          isChildActive(item) && "bg-accent font-bold"
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          {item.icon}
                          {item.label}
                        </span>
                        {expandedItems.includes(item.label) ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                      {expandedItems.includes(item.label) && (
                        <div className="ml-6 border-l-2 border-border space-y-0.5 pl-3">
                          {item.children.map((child) => (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "block px-3 py-2 text-sm transition-colors hover:bg-accent",
                                isActive(child.path) && "bg-primary text-primary-foreground font-bold"
                              )}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent",
                        isActive(item.path) && "bg-primary text-primary-foreground font-bold"
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t-2 border-border p-3">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center border-2 border-border bg-warning text-warning-foreground text-xs font-bold">
              SA
            </div>
            <div className="text-sm flex-1 min-w-0">
              <p className="font-bold truncate">Super Admin</p>
              <p className="text-muted-foreground text-xs truncate">superadmin@erp.com</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground px-3 pb-1">Prototype: full access (no backend)</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b-2 border-border px-4 py-3 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Construction Company ERP
          </h2>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
