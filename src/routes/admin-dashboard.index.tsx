import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { unwrapList } from "@/lib/api-unwrap";
import * as categoryService from "@/services/categoryService";
import * as testSeriesService from "@/services/testSeriesService";
import * as testService from "@/services/testService";
import * as questionService from "@/services/questionService";
import * as userService from "@/services/userService";

export const Route = createFileRoute("/admin-dashboard/")({
  component: AdminDashboardHome,
});

function AdminDashboardHome() {
  const { data: categoriesRes } = useQuery({ queryKey: ["ad-categories"], queryFn: () => categoryService.getCategories() });
  const { data: seriesRes } = useQuery({ queryKey: ["ad-series"], queryFn: () => testSeriesService.getTestSeries() });
  const { data: testsRes } = useQuery({ queryKey: ["ad-tests"], queryFn: () => testService.getTests() });
  const { data: usersRes } = useQuery({ queryKey: ["ad-users"], queryFn: () => userService.getAllUsers() });

  const categories = unwrapList<any>(categoriesRes);
  const series = unwrapList<any>(seriesRes);
  const tests = unwrapList<any>(testsRes);
  const users = unwrapList<any>(usersRes);

  // Question count = sum of each test's totalQuestions, so we don't need a
  // separate "all questions" endpoint (there isn't one — questions are only
  // listable per-test via GET /admin/questions?test=).
  const totalQuestions = tests.reduce((sum, t) => sum + (t.totalQuestions ?? 0), 0);

  const stats = [
    { label: "Categories", value: categories.length },
    { label: "Test Series", value: series.length },
    { label: "Tests", value: tests.length },
    { label: "Questions", value: totalQuestions },
    { label: "Users", value: users.length },
  ];

  return (
    <div>
      <h2 className="text-base font-semibold mb-4">Dashboard</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="border border-border rounded-md p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-semibold mt-1">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
