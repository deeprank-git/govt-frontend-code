import { createFileRoute, redirect, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getToken, getUser, clearAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

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

const NAV_ITEMS = [
  { to: "/admin-dashboard" as const, label: "Dashboard", exact: true },
  { to: "/admin-dashboard/categories" as const, label: "Categories" },
  { to: "/admin-dashboard/test-series" as const, label: "Test Series" },
  { to: "/admin-dashboard/tests" as const, label: "Tests" },
  { to: "/admin-dashboard/questions" as const, label: "Questions" },
  { to: "/admin-dashboard/users" as const, label: "Users" },
];

function AdminDashboardLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const logOut = () => {
    clearAuth();
    navigate({ to: "/admin-login" });
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-[230px] shrink-0 border-r border-border bg-muted/30 flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <h1 className="text-base font-semibold">Admin Dashboard</h1>
        </div>
        <nav className="flex-1 py-2">
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "block px-4 py-2 text-sm border-l-2 border-transparent",
                  active
                    ? "border-l-primary bg-background font-medium text-foreground"
                    : "text-muted-foreground hover:bg-background/60",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="outline" size="sm" className="w-full" onClick={logOut}>
            Log out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-4 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
