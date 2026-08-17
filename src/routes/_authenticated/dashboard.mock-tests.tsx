import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ClipboardList, Database, Search, ChevronRight, ArrowLeft, FileText, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ExamIcon } from "@/components/site/ExamIcon";
import * as categoryService from "@/services/categoryService";
import * as testService from "@/services/testService";
import * as testSeriesService from "@/services/testSeriesService";
import * as mediaService from "@/services/mediaService";
import { unwrapList } from "@/lib/api-unwrap";
import { cn } from "@/lib/utils";
import { isPublishedVisible } from "@/lib/publish";

export const Route = createFileRoute("/_authenticated/dashboard/mock-tests")({
  component: MockTests,
});

function MockTests() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [catSearch, setCatSearch] = useState("");
  const [activeSeriesId, setActiveSeriesId] = useState<string | null>(null);

  const { data: categoriesRes, isLoading: loadingCats } = useQuery({
    queryKey: ["mt-categories"],
    queryFn: () => categoryService.getCategories(),
  });
  const categories = unwrapList<any>(categoriesRes);
  // The backend already excludes inactive categories from this endpoint, so
  // membership in this set is also how unpublished categories cascade to
  // hide their test series/tests below, with no extra category-level flag needed.
  const activeCategoryIds = useMemo(() => new Set(categories.map((c) => c._id)), [categories]);
  // Default to the first category once loaded, same as the Overview page —
  // there's no "All" option here either.
  const resolvedCategory = activeCategory ?? categories[0]?._id ?? null;
  const activeCategoryName = categories.find((c) => c._id === resolvedCategory)?.name ?? "";

  const filteredCategories = useMemo(() => {
    if (!catSearch.trim()) return categories;
    const q = catSearch.trim().toLowerCase();
    return categories.filter((c) => String(c.name ?? "").toLowerCase().includes(q));
  }, [categories, catSearch]);

  const { data: seriesRes, isLoading: loadingSeries } = useQuery({
    queryKey: ["mt-series"],
    queryFn: () => testSeriesService.getTestSeries({ isPublished: true, isActive: true }),
  });
  const allSeries = unwrapList<any>(seriesRes);
  const series = useMemo(
    () => allSeries.filter((s) => isPublishedVisible(s) && activeCategoryIds.has(s.category?._id ?? s.category)),
    [allSeries, activeCategoryIds],
  );
  const seriesInCategory = useMemo(
    () => series.filter((s) => (s.category?._id ?? s.category) === resolvedCategory),
    [series, resolvedCategory],
  );
  const activeSeries = series.find((s) => s._id === activeSeriesId) ?? null;
  const seriesLogoUrl = activeSeries?.image ? mediaService.resolveMediaUrl(activeSeries.image) : undefined;

  const visibleSeriesIds = useMemo(() => new Set(series.map((s) => s._id)), [series]);

  const { data: testsRes, isLoading: loadingTests } = useQuery({
    queryKey: ["all-mock-tests"],
    queryFn: () => testService.getTests({ paperType: "mock", isPublished: true, isActive: true }),
  });
  const allTests = unwrapList<any>(testsRes);
  const tests = useMemo(
    () => allTests.filter((t) => isPublishedVisible(t) && visibleSeriesIds.has(typeof t.testSeries === "object" ? t.testSeries?._id : t.testSeries)),
    [allTests, visibleSeriesIds],
  );

  const { data: seriesTestsRes, isLoading: loadingSeriesTests } = useQuery({
    queryKey: ["mt-series-tests", activeSeriesId],
    queryFn: () => testService.getTests({ testSeries: activeSeriesId!, paperType: "mock", isPublished: true, isActive: true }),
    enabled: !!activeSeriesId,
  });
  const allSeriesTests = unwrapList<any>(seriesTestsRes);
  // activeSeries is only ever set from an already-visible series card, but
  // re-check here too in case activeSeriesId was set before this series lost
  // its published/active status (e.g. an admin unpublished it moments ago).
  const seriesTests = useMemo(
    () => (activeSeries ? allSeriesTests.filter((t) => isPublishedVisible(t)) : []),
    [allSeriesTests, activeSeries],
  );

  const goToInstructions = (testId: string) => navigate({ to: "/test/$testId/instructions", params: { testId } });

  const selectCategory = (id: string) => {
    setActiveCategory(id);
    setActiveSeriesId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold flex items-center gap-2">
            Mock Tests <ClipboardList className="h-5 w-5 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground">
            Take mock tests to evaluate your preparation and improve your performance.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
          <Stat icon={ClipboardList} value={`${tests.length}`} label="Mock Tests Available" tone="primary" />
          <Stat icon={Database} value={`${series.length}`} label="Exams" tone="success" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 items-start">
        {/* Categories */}
        <Card className="p-3 h-fit">
          <h3 className="font-display font-semibold mb-2 text-sm px-1">Exam Categories</h3>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Search categories…"
              className="pl-8 h-8 text-sm"
            />
          </div>
          {loadingCats ? (
            <div className="space-y-1.5">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 rounded-md" />)}
            </div>
          ) : filteredCategories.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1 py-2">No categories match your search.</p>
          ) : (
            filteredCategories.map((c) => {
              const count = series.filter((s) => (s.category?._id ?? s.category) === c._id).length;
              const active = resolvedCategory === c._id;
              return (
                <button
                  key={c._id}
                  onClick={() => selectCategory(c._id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between mt-0.5",
                    active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted",
                  )}
                >
                  {c.name}
                  <span className="text-xs text-muted-foreground">{count}</span>
                </button>
              );
            })
          )}
        </Card>

        {/* Test series for the selected category, or tests inside the selected series */}
        {!activeSeriesId ? (
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <h2 className="font-display font-bold text-lg">
                {seriesInCategory.length} Test Series{activeCategoryName ? ` in ${activeCategoryName}` : ""}
              </h2>
            </div>

            {loadingSeries ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : seriesInCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No test series available in this category yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {seriesInCategory.map((s) => {
                  const logoUrl = s.image ? mediaService.resolveMediaUrl(s.image) : undefined;
                  return (
                    <button
                      key={s._id}
                      onClick={() => setActiveSeriesId(s._id)}
                      className="group text-left rounded-lg border border-border p-3 flex items-center gap-3 hover:border-primary hover:shadow-elevate transition"
                    >
                      {logoUrl ? (
                        <img src={logoUrl} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <ExamIcon name={s.name ?? "?"} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {tests.filter((t) => (typeof t.testSeries === "object" ? t.testSeries?._id : t.testSeries) === s._id).length} Tests
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-4 sm:p-5">
            <Button variant="ghost" size="sm" className="-ml-2 mb-3" onClick={() => setActiveSeriesId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Test Series
            </Button>
            <h2 className="font-display font-bold text-lg mb-4">
              {activeSeries?.name ?? "Test Series"} — Mock Tests
            </h2>

            {loadingSeriesTests || loadingTests ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : seriesTests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No mock tests available in this series yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {seriesTests.map((t) => (
                  <div key={t._id} className="rounded-xl border border-border p-4 flex flex-col gap-3 hover:shadow-md transition-shadow bg-card">
                    <div className="flex items-start gap-3">
                      {seriesLogoUrl ? (
                        <img src={seriesLogoUrl} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-blue-50 grid place-items-center shrink-0">
                          <ClipboardList className="h-5 w-5 text-blue-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm leading-snug">{t.title}</div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{t.description ?? "Mock test"}</div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span>{t.totalQuestions} Questions &nbsp;·&nbsp; {t.totalMarks} Marks</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{t.duration} Minutes</span>
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => goToInstructions(t._id)}>
                      Start Test →
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: any;
  value: string;
  label: string;
  tone: string;
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    purple: "bg-purple-100 text-purple-600",
  };
  return (
    <Card className="px-3 py-2.5 flex items-center gap-2.5 min-w-0">
      <span className={cn("h-9 w-9 rounded-lg grid place-items-center shrink-0", toneMap[tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="font-display font-bold leading-tight">{value}</div>
        <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
      </div>
    </Card>
  );
}
