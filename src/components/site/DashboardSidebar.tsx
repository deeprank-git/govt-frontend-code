import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Gauge,
  Trophy,
  ClipboardList,
  FileText,
  History,
  Newspaper,
  KeyRound,
  Bell,
  Settings2,
  Shield,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ITEMS = [
  { to: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/overview" as const, label: "Exams Overview", icon: Gauge },
  { to: "/dashboard/rank" as const, label: "All India Rank", icon: Trophy },
  { to: "/dashboard/mock-tests" as const, label: "Mock Tests", icon: ClipboardList },
  { to: "/dashboard/attempted-tests" as const, label: "Attempted Tests", icon: History },
  { to: "/dashboard/previous-year-papers" as const, label: "Previous Year Papers", icon: FileText },
  { to: "/dashboard/current-affairs" as const, label: "Current Affairs", icon: Newspaper },
  // Answer Key and Exam Alerts are still fully static/mock-data pages with no
  // backend support — hidden from the sidebar until that's built. Not deleted,
  // just unlinked; the routes still exist and work if navigated to directly.
  // { to: "/dashboard/answer-key" as const, label: "Answer Key", icon: KeyRound },
  // { to: "/dashboard/exam-alerts" as const, label: "Exam Alerts", icon: Bell },
  { to: "/dashboard/profile" as const, label: "Profile Settings", icon: Settings2 },
];

export function DashboardSidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useSidebar();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-3 border-b border-sidebar-border">
        <Logo size="h-12" boxClassName="py-0.5 justify-start" to="/dashboard" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map((it) => {
                const active = it.exact ? pathname === it.to : pathname === it.to || pathname.startsWith(it.to + "/");
                return (
                  <SidebarMenuItem key={it.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={it.to} className={cn("flex items-center gap-2.5")}>
                        <it.icon className="h-4 w-4" />
                        <span>{it.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {/* Admin Panel nav item hidden from the dashboard sidebar for now,
                  regardless of role — the `isAdmin` prop and role-based check
                  are kept (see component signature below) so this can be
                  restored by uncommenting, without re-deriving the pattern.
                  The /admin route itself is untouched.
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/admin")}>
                    <Link to="/admin" className="flex items-center gap-2.5">
                      <Shield className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              */}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        {state === "collapsed" ? null : pathname.startsWith("/dashboard/attempted-tests") ? (
          <Card className="p-3 bg-primary/5 border-primary/20 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
            <div className="font-display font-semibold text-sm mt-2">Track Your Performance</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Analyze your test performance and identify your strengths.
            </p>
            <Button asChild size="sm" className="mt-3 w-full">
              <Link to="/dashboard">View Performance</Link>
            </Button>
          </Card>
        ) : pathname.startsWith("/dashboard/current-affairs") ? (
          null
          /* Daily Current Affairs Quiz card — commented out per request 2026-07-31
          <Card className="p-3 bg-success/5 border-success/20 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-success/10 grid place-items-center">
              <ClipboardCheck className="h-7 w-7 text-success" />
            </div>
            <div className="font-display font-semibold text-sm mt-2">Daily Current Affairs Quiz</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Test your knowledge with today's current affairs.
            </p>
            <Button asChild size="sm" className="mt-3 w-full">
              <Link to="/dashboard/mock-tests">Start Quiz</Link>
            </Button>
          </Card>
          */
        ) : pathname.startsWith("/dashboard/answer-key") ? (
          <Card className="p-3 bg-primary/5 border-primary/20 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center">
              <ClipboardCheck className="h-7 w-7 text-primary" />
            </div>
            <div className="font-display font-semibold text-sm mt-2">Check. Calculate. Improve.</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Compare your answers and estimate your score instantly.
            </p>
            <Button asChild size="sm" className="mt-3 w-full">
              <Link to="/dashboard/answer-key">Check Now</Link>
            </Button>
          </Card>
        ) : pathname.startsWith("/dashboard/exam-alerts") ? (
          <Card className="p-3 bg-primary/5 border-primary/20 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center relative">
              <Bell className="h-7 w-7 text-primary" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] grid place-items-center font-bold">4</span>
            </div>
            <div className="font-display font-semibold text-sm mt-2">Never miss an important exam or notification.</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Stay updated with real-time alerts and reminders.
            </p>
            <Button asChild size="sm" className="mt-3 w-full">
              <Link to="/dashboard/exam-alerts">How It Works</Link>
            </Button>
          </Card>
        ) : pathname.startsWith("/dashboard/profile") ? (
          null
          /* Secure Your Account / Enable 2FA card — commented out per request 2026-07-31
          <Card className="p-3 bg-primary/5 border-primary/20 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 grid place-items-center relative">
              <Shield className="h-7 w-7 text-primary" />
              <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-success grid place-items-center">
                <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </span>
            </div>
            <div className="font-display font-semibold text-sm mt-2">Secure Your Account</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Keep your account secure and data protected.
            </p>
            <Button variant="outline" size="sm" className="mt-3 w-full border-primary text-primary hover:bg-primary/10">
              Enable 2FA
            </Button>
          </Card>
          */
        ) : pathname.startsWith("/dashboard/previous-year-papers") ? (
          <Card className="p-3 bg-primary/5 border-primary/20 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center">
              <ClipboardList className="h-7 w-7 text-primary" />
            </div>
            <div className="font-display font-semibold text-sm mt-2">Practice Mock Tests</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Evaluate your preparation with full-length mock tests.
            </p>
            <Button asChild size="sm" className="mt-3 w-full">
              <Link to="/dashboard/mock-tests">Explore Tests</Link>
            </Button>
          </Card>
        ) : (
          <Card className="p-3 bg-primary/5 border-primary/20 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <div className="font-display font-semibold text-sm mt-2">Practice Previous Year Papers</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Understand exam pattern and boost your preparation.
            </p>
            <Button asChild size="sm" className="mt-3 w-full">
              <Link to="/dashboard/previous-year-papers">Explore Papers</Link>
            </Button>
          </Card>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
