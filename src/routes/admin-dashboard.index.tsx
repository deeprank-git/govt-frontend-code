import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { unwrapItem } from "@/lib/api-unwrap";
import * as analyticsService from "@/services/analyticsService";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  FolderOpen,
  Layers,
  FileText,
  HelpCircle,
  Users,
  BookOpen,
  Newspaper,
  AlertTriangle,
  TrendingUp,
  UserPlus,
} from "lucide-react";

export const Route = createFileRoute("/admin-dashboard/")({
  component: AdminDashboardHome,
});

type StatItem = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  to?: string;
};

function StatCard({ s }: { s: StatItem }) {
  const Icon = s.icon;
  const inner = (
    <div className="border border-border rounded-lg p-4 bg-background shadow-sm hover:shadow-md transition-shadow h-full">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", s.iconBg)}>
        <Icon className={cn("w-4 h-4", s.iconColor)} />
      </div>
      <div className="text-2xl font-bold tabular-nums">{s.value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
    </div>
  );
  if (s.to) {
    return (
      <Link to={s.to as "/admin-dashboard/reports"} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

function AdminDashboardHome() {
  const { data: overviewRes, isLoading } = useQuery({
    queryKey: ["ad-analytics-overview"],
    queryFn: () => analyticsService.getOverview(),
  });
  const overview = unwrapItem<any>(overviewRes);

  const users = overview?.users ?? {};
  const content = overview?.content ?? {};
  const attempts = overview?.attempts ?? {};
  const moderation = overview?.moderation ?? {};

  const primaryStats: StatItem[] = [
    {
      label: "Categories",
      value: content.categories ?? 0,
      icon: FolderOpen,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Test Series",
      value: content.testSeries ?? 0,
      icon: Layers,
      iconBg: "bg-violet-100 dark:bg-violet-900/30",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "Tests",
      value: content.tests ?? 0,
      icon: FileText,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Questions",
      value: content.questions ?? 0,
      icon: HelpCircle,
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Total Users",
      value: users.total ?? 0,
      icon: Users,
      iconBg: "bg-rose-100 dark:bg-rose-900/30",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
  ];

  const activityStats: StatItem[] = [
    {
      label: "Published Tests",
      value: content.publishedTests ?? 0,
      icon: BookOpen,
      iconBg: "bg-teal-100 dark:bg-teal-900/30",
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    {
      label: "Current Affairs",
      value: content.currentAffairs ?? 0,
      icon: Newspaper,
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Pending Reports",
      value: moderation.pendingReports ?? 0,
      to: "/admin-dashboard/reports",
      icon: AlertTriangle,
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
    },
    {
      label: "Avg Score",
      value: `${attempts.avgScorePercentage ?? 0}%`,
      icon: TrendingUp,
      iconBg: "bg-sky-100 dark:bg-sky-900/30",
      iconColor: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "New Users (7d)",
      value: users.newLast7Days ?? 0,
      icon: UserPlus,
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-28 mb-1" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3 w-16" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of your platform's content and activity.</p>
      </div>

      <div className="mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Content</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {primaryStats.map((s) => (
          <StatCard key={s.label} s={s} />
        ))}
      </div>

      <div className="mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Activity</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {activityStats.map((s) => (
          <StatCard key={s.label} s={s} />
        ))}
      </div>
    </div>
  );
}
