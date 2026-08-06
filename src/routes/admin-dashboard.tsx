import { createFileRoute, redirect, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getToken, getUser } from "@/lib/auth-store";
import * as authService from "@/services/authService";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  Layers,
  FileText,
  HelpCircle,
  Users,
  Newspaper,
  Flag,
  Bell,
  UserCircle,
  LogOut,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/admin-dashboard")({
  ssr: false,
  beforeLoad: () => {
    const token = getToken();
    const user = getUser();
    if (!token || user?.role !== "admin") {
      throw redirect({ to: "/admin-login" });
    }
  },
  component: AdminDashboardLayout,
});

const NAV_SECTIONS = [
  {
    label: "Content",
    items: [
      { to: "/admin-dashboard" as const, label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/admin-dashboard/categories" as const, label: "Categories", icon: FolderOpen },
      { to: "/admin-dashboard/test-series" as const, label: "Test Series", icon: Layers },
      { to: "/admin-dashboard/tests" as const, label: "Tests", icon: FileText },
      { to: "/admin-dashboard/questions" as const, label: "Questions", icon: HelpCircle },
      { to: "/admin-dashboard/users" as const, label: "Users", icon: Users },
    ],
  },
  {
    label: "Communication",
    items: [
      { to: "/admin-dashboard/current-affairs" as const, label: "Current Affairs", icon: Newspaper },
      // Temporarily disabled - Pages section temporarily hidden (2026-08-04).
      // { to: "/admin-dashboard/pages" as const, label: "Pages", icon: ... },
      // Temporarily disabled - Media section temporarily hidden (2026-08-04).
      // { to: "/admin-dashboard/media" as const, label: "Media", icon: ... },
      { to: "/admin-dashboard/reports" as const, label: "Reports", icon: Flag },
      // { to: "/admin-dashboard/notifications" as const, label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Account",
    items: [{ to: "/admin-dashboard/profile" as const, label: "My Profile", icon: UserCircle }],
  },
];

function AdminDashboardLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = getUser();

  const logOut = () => {
    authService.logout();
    navigate({ to: "/admin-login" });
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AD";

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-[240px] shrink-0 border-r border-border bg-muted/30 flex flex-col">
        {/* Brand */}
        <div className="px-4 py-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold leading-tight">Testopy Admin</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">Management Console</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-4">
              <div className="px-4 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section.label}
                </span>
              </div>
              <div className="px-2 space-y-0.5">
                {section.items.map((item) => {
                  const active = item.exact
                    ? pathname === item.to
                    : pathname === item.to || pathname.startsWith(item.to + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        active
                          ? "bg-background shadow-sm font-medium text-foreground"
                          : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          active ? "text-primary" : "opacity-60",
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate leading-tight">{user?.name ?? "Admin"}</p>
              <p className="text-[10px] text-muted-foreground truncate leading-tight">{user?.email ?? ""}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground h-8 px-2"
            onClick={logOut}
          >
            <LogOut className="w-3.5 h-3.5" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-12 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-end px-6 gap-2 shrink-0">
          {/* <Link
            to="/admin-dashboard/notifications"
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Bell className="w-4 h-4" />
          </Link>
          <div className="w-px h-5 bg-border mx-1" /> */}
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-primary">{initials}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
