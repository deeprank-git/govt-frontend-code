import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { unwrapItem } from "@/lib/api-unwrap";
import * as analyticsService from "@/services/analyticsService";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin-dashboard/")({
  component: AdminDashboardHome,
});

function AdminDashboardHome() {
  const { data: overviewRes, isLoading } = useQuery({ queryKey: ["ad-analytics-overview"], queryFn: () => analyticsService.getOverview() });
  const overview = unwrapItem<any>(overviewRes);

  const users = overview?.users ?? {};
  const content = overview?.content ?? {};
  const attempts = overview?.attempts ?? {};
  const moderation = overview?.moderation ?? {};

  const stats = [
    { label: "Categories", value: content.categories ?? 0 },
    { label: "Test Series", value: content.testSeries ?? 0 },
    { label: "Tests", value: content.tests ?? 0 },
    { label: "Questions", value: content.questions ?? 0 },
    { label: "Users", value: users.total ?? 0 },
  ];

  const secondaryStats = [
    { label: "Published Tests", value: content.publishedTests ?? 0 },
    { label: "Current Affairs", value: content.currentAffairs ?? 0 },
    { label: "Pending Reports", value: moderation.pendingReports ?? 0, to: "/admin-dashboard/reports" },
    { label: "Avg Score", value: `${attempts.avgScorePercentage ?? 0}%` },
    { label: "New Users (7d)", value: users.newLast7Days ?? 0 },
  ];

  return (
    <div>
      <h2 className="text-base font-semibold mb-4">Dashboard</h2>
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="border border-border rounded-md p-4">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-2xl font-semibold mt-1">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
            {secondaryStats.map((s) =>
              s.to ? (
                <Link key={s.label} to={s.to} className="border border-border rounded-md p-4 hover:border-primary transition">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-2xl font-semibold mt-1">{s.value}</div>
                </Link>
              ) : (
                <div key={s.label} className="border border-border rounded-md p-4">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-2xl font-semibold mt-1">{s.value}</div>
                </div>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}
