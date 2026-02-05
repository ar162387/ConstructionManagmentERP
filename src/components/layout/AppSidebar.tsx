import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  LayoutDashboard,
  Wallet,
  BarChart3,
  Users,
  FolderKanban,
  Package,
  UserCog,
  Truck,
  FileText,
  Shield,
  ChevronDown,
  LogOut,
  Settings,
  FileStack,
  PackageMinus,
  PackagePlus,
  Warehouse,
  HardHat,
  Receipt,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const companyMenuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin'] },
  { title: 'Bank & Accounts', url: '/bank', icon: Wallet, roles: ['super_admin', 'admin'] },
  { title: 'Vendor Invoices', url: '/invoices', icon: FileStack, siteManagerOnly: true },
  { title: 'Receiving (Non-Consumable)', url: '/inventory/receiving', icon: PackagePlus, siteManagerOnly: true },
  { title: 'Analytics', url: '/analytics', icon: BarChart3, roles: ['super_admin', 'admin'] },
  { title: 'Vendors', url: '/vendors', icon: Truck, siteManagerOnly: true },
  { title: 'User Management', url: '/users', icon: Users, roles: ['super_admin', 'admin'] },
  { title: 'Audit Logs', url: '/audit', icon: Shield, roles: ['super_admin'] },
];

const projectMenuItems = [
  { title: 'Projects', url: '/projects', icon: FolderKanban },
  { title: 'Inventory', url: '/inventory', icon: Package, end: true },
  { title: 'Store Inventory', url: '/inventory/store', icon: Warehouse },
  { title: 'Stock Consumption', url: '/stock-consumption', icon: PackageMinus },
  { title: 'Contractors', url: '/contractors', icon: HardHat },
  { title: 'Contractor Billing', url: '/contractor-billing', icon: Receipt },
  { title: 'Personnel', url: '/personnel', icon: UserCog },
  { title: 'Expenses', url: '/expenses', icon: FileText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [companyOpen, setCompanyOpen] = useState(true);
  const [projectOpen, setProjectOpen] = useState(true);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'site_manager':
        return 'Site Manager';
      default:
        return role;
    }
  };

  const filteredCompanyItems = companyMenuItems.filter((item) => {
    if (!user) return false;
    const menuItem = item as typeof item & { siteManagerOnly?: boolean };
    if (user.role === 'site_manager') {
      return menuItem.siteManagerOnly === true;
    }
    return (
      (menuItem.roles && menuItem.roles.includes(user.role)) ||
      menuItem.siteManagerOnly === true
    );
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">ProjectFlow</span>
              <span className="text-xs text-muted-foreground">ERP System</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {/* Company Level */}
        <Collapsible open={companyOpen} onOpenChange={setCompanyOpen}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex cursor-pointer items-center justify-between px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
                {!collapsed && <span>Company</span>}
                {!collapsed && (
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      companyOpen && 'rotate-180'
                    )}
                  />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredCompanyItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        tooltip={item.title}
                      >
                        <NavLink
                          to={item.url}
                          className="flex items-center gap-3"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Project Level */}
        <Collapsible open={projectOpen} onOpenChange={setProjectOpen}>
          <SidebarGroup className="mt-4">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex cursor-pointer items-center justify-between px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
                {!collapsed && <span>Projects</span>}
                {!collapsed && (
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      projectOpen && 'rotate-180'
                    )}
                  />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {projectMenuItems.map((item) => {
                    const menuItem = item as typeof item & { end?: boolean };
                    return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        tooltip={item.title}
                      >
                        <NavLink
                          to={item.url}
                          end={menuItem.end}
                          className="flex items-center gap-3"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {user && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>
                  {user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-sidebar-foreground">
                    {user.name}
                  </span>
                  <Badge
                    variant={getRoleBadgeVariant(user.role)}
                    className="mt-0.5 w-fit text-xs"
                  >
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
              )}
            </div>
            {!collapsed && (
              <div className="flex gap-2">
                <SidebarMenuButton
                  asChild
                  className="flex-1 justify-center"
                  tooltip="Settings"
                >
                  <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                    <Settings className="h-4 w-4" />
                    <span className="text-xs">Settings</span>
                  </button>
                </SidebarMenuButton>
                <SidebarMenuButton
                  className="flex-1 justify-center text-destructive hover:bg-destructive/10"
                  tooltip="Logout"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-xs">Logout</span>
                </SidebarMenuButton>
              </div>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
