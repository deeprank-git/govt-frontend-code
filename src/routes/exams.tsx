import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState, useEffect } from "react";
import { ChevronRight, Search, BookOpen, FileText, ClipboardList, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { ExamIcon } from "@/components/site/ExamIcon";
import * as categoryService from "@/services/categoryService";
import * as testSeriesService from "@/services/testSeriesService";
import * as testService from "@/services/testService";
import * as mediaService from "@/services/mediaService";
import { unwrapList } from "@/lib/api-unwrap";
import { cn } from "@/lib/utils";
import { isPublishedVisible } from "@/lib/publish";

export const Route = createFileRoute("/exams")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "All Government Exams — Testopy" },
      { name: "description", content: "Browse government exams across SSC, Banking, Railways, UPSC and more — free mock tests, previous year papers and exam details." },
      { property: "og:title", content: "All Government Exams — Testopy" },
      { property: "og:description", content: "Find the right exam, syllabus and free mock tests." },
    ],
  }),
  component: ExamsPage,
});

function ExamsPage() {
  const { q: searchQ } = Route.useSearch();
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [q, setQ] = useState(searchQ ?? "");
  const { hash } = useLocation();
  const appliedHash = useRef<string | null>(null);

  const { data: categoriesRes, isLoading: loadingCats } = useQuery({
    queryKey: ["exams-categories"],
    queryFn: () => categoryService.getCategories(),
  });
  const categories = unwrapList<any>(categoriesRes);
  // The backend already excludes inactive categories from this endpoint, so
  // membership in this set is also how unpublished categories cascade to
  // hide their test series/tests below, with no extra category-level flag needed.
  const activeCategoryIds = useMemo(() => new Set(categories.map((c) => c._id)), [categories]);

  const { data: seriesRes, isLoading: loadingSeries } = useQuery({
    queryKey: ["exams-series"],
    queryFn: () => testSeriesService.getTestSeries({ isPublished: true, isActive: true }),
  });
  const allSeries = unwrapList<any>(seriesRes);
  const series = useMemo(
    () => allSeries.filter((s) => isPublishedVisible(s) && activeCategoryIds.has(s.category?._id ?? s.category)),
    [allSeries, activeCategoryIds],
  );

  const { data: testsRes, isLoading: loadingTests } = useQuery({
    queryKey: ["exams-tests"],
    queryFn: () => testService.getTests({ isPublished: true, isActive: true }),
  });
  const allTests = unwrapList<any>(testsRes);
  const visibleSeriesIds = useMemo(() => new Set(series.map((s) => s._id)), [series]);
  const visibleTests = useMemo(
    () => allTests.filter((t) => isPublishedVisible(t) && visibleSeriesIds.has(typeof t.testSeries === "object" ? t.testSeries?._id : t.testSeries)),
    [allTests, visibleSeriesIds],
  );

  const isLoading = loadingCats || loadingSeries || loadingTests;

  useEffect(() => {
    if (!hash || categories.length === 0 || appliedHash.current === hash) return;
    appliedHash.current = hash;
    const term = hash.replace(/^#/, "").toLowerCase();
    const matched = categories.find((c) =>
      (c.name as string).toLowerCase().includes(term)
    );
    if (matched) setActiveCat(matched._id);
  }, [hash, categories]);

  // Default to the first category once loaded — there's no "All" option here,
  // same as the equivalent logged-in Overview page.
  const resolvedCat = activeCat ?? categories[0]?._id ?? null;
  const activeCategoryName = categories.find((c) => c._id === resolvedCat)?.name ?? "";

  const filtered = useMemo(() => {
    return series.filter((s) => {
      const catId = s.category?._id ?? s.category;
      if (resolvedCat && catId !== resolvedCat) return false;
      if (q && !String(s.name ?? "").toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [series, resolvedCat, q]);

  const freePct = series.length ? Math.round((series.filter((s) => !s.isPaid).length / series.length) * 100) : 0;

  const STATS = [
    { icon: BookOpen, value: `${categories.length}`, label: "Categories" },
    { icon: FileText, value: `${series.length}`, label: "Test Series" },
    { icon: ClipboardList, value: `${visibleTests.length}`, label: "Mock Tests" },
    { icon: Sparkles, value: `${freePct}%`, label: "Free Access" },
  ];

  return (
    <SiteShell>
      <div className="container mx-auto px-4 lg:px-6 pt-6 pb-16">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Exams" }]} />

        <div className="mt-6 grid lg:grid-cols-[1fr_auto] gap-4 items-start">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-extrabold">All Exams</h1>
            <p className="mt-2 text-muted-foreground">
              Browse exam categories and jump straight into a test series.
            </p>
          </div>
          <Card className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3">
            {STATS.map((s) => (
              <div key={s.label} className="flex items-center gap-2.5">
                <span className="h-9 w-9 grid place-items-center rounded-md bg-primary/10 text-primary shrink-0">
                  <s.icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-display font-bold text-base leading-tight">{s.value}</div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">{s.label}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div className="mt-8 grid lg:grid-cols-[260px_1fr] gap-6 items-start">
          {/* Categories */}
          <Card className="p-4 h-fit">
            <h3 className="font-display font-semibold mb-3 text-sm">Exam Categories</h3>
            {isLoading ? (
              <div className="space-y-1.5">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 rounded-md" />)}
              </div>
            ) : categories.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 py-2">No categories yet.</p>
            ) : (
              categories.map((c) => {
                const count = series.filter((s) => (s.category?._id ?? s.category) === c._id).length;
                const active = resolvedCat === c._id;
                return (
                  <button
                    key={c._id}
                    onClick={() => setActiveCat(c._id)}
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

          {/* Test series for the selected category */}
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
              <h2 className="font-display font-bold text-lg">
                {filtered.length} Test Series{activeCategoryName ? ` in ${activeCategoryName}` : ""}
              </h2>
              <div className="relative md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search test series…" className="pl-9" />
              </div>
            </div>

            {isLoading ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {series.length === 0 ? "No test series available yet." : "No test series match your search."}
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {filtered.map((s) => {
                  const logoUrl = s.image ? mediaService.resolveMediaUrl(s.image) : undefined;
                  return (
                    <Link
                      key={s._id}
                      to="/exams/$id"
                      params={{ id: s._id }}
                      search={{
                        name: s.name,
                        category: activeCategoryName || undefined,
                        image: s.image || undefined,
                        description: s.description || undefined,
                      }}
                      className="group block"
                    >
                      <div className="rounded-lg border border-border p-3 flex items-center gap-3 hover:border-primary hover:shadow-elevate transition">
                        {logoUrl ? (
                          <img src={logoUrl} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                        ) : (
                          <ExamIcon name={s.name ?? "?"} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{s.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {visibleTests.filter((t) => (typeof t.testSeries === "object" ? t.testSeries?._id : t.testSeries) === s._id).length} Tests
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </SiteShell>
  );
}
