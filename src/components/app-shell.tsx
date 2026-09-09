import { Link, useRouterState, Outlet, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Inbox,
  CalendarDays,
  Calendar,
  Wallet,
  Camera,
  Package,
  Heart,
  Settings as SettingsIcon,
  LogOut,
  Menu,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth, signOut } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, managerOnly: true },
  { to: "/leads", label: "Leads", icon: Inbox, managerOnly: true },
  { to: "/eventos", label: "Eventos", icon: CalendarDays, managerOnly: false },
  { to: "/calendario", label: "Calendário", icon: Calendar, managerOnly: false },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, managerOnly: false },
  { to: "/fotografos", label: "Fotógrafos", icon: Camera, managerOnly: true },
  { to: "/meu-perfil", label: "Meu Perfil", icon: Camera, photographerOnly: true },
  { to: "/pacotes", label: "Pacotes", icon: Package, managerOnly: true },
  { to: "/wedding-planners", label: "Wedding Planners", icon: Heart, managerOnly: true },
  { to: "/settings", label: "Definições", icon: SettingsIcon, managerOnly: true },
];

export function AppShell() {
  const { user, loading, role, initials } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: {} as any });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        A carregar…
      </div>
    );
  }

  const visible = navItems.filter((i: any) => {
    if (i.managerOnly && role !== "manager") return false;
    if (i.photographerOnly && role !== "photographer") return false;
    return true;
  });

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="text-lg font-semibold tracking-tight text-sidebar-foreground">PRISM</div>
        <div className="text-xs text-muted-foreground">Management</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visible.map((item) => {
          const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <div className="px-3 py-2 text-xs text-muted-foreground">
          {initials ? `${initials} · ` : ""}
          {role === "manager" ? "Manager" : "Fotógrafo"}
        </div>
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Terminar sessão
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="hidden md:flex w-64 shrink-0 bg-sidebar border-r border-sidebar-border">
        {SidebarContent}
      </aside>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-sidebar border-r border-sidebar-border">{SidebarContent}</div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 flex items-center px-4 border-b bg-card">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-3 font-semibold">PRISM</span>
        </header>
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="p-6 max-w-[1400px] mx-auto">{children}</div>;
}
