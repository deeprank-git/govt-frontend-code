import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText,
  CalendarDays,
  ClipboardList,
  Users,
  RotateCcw,
  Bookmark,
  Play,
  Flame,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as testService from "@/services/testService";
import * as testSeriesService from "@/services/testSeriesService";
import * as testAttemptService from "@/services/testAttemptService";
import { unwrapList } from "@/lib/api-unwrap";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/previous-year-papers")({
  component: PYQPage,
});

const PAGE_SIZE = 6;

const ICON_TINTS = [
  "bg-emerald-50 text-emerald-600",
  "bg-orange-50 text-orange-600",
  "bg-violet-50 text-violet-600",
  "bg-amber-50 text-amber-600",
  "bg-rose-50 text-rose-600",
  "bg-sky-50 text-sky-600",
];

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCount(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function PYQPage() {
  const navigate = useNavigate();
  const [testSeries, setTestSeries] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [starting, setStarting] = useState<string | null>(null);

  const { data: seriesRes } = useQuery({
    queryKey: ["pyq-test-series"],
    queryFn: () => testSeriesService.getTestSeries(),
  });
  const allSeries = unwrapList<any>(seriesRes);
  const seriesNameById = useMemo(() => {
    const map = new Map<string, string>();
    allSeries.forEach((s) => map.set(s._id, s.name));
    return map;
  }, [allSeries]);

  const { data: testsRes, isLoading } = useQuery({
    queryKey: ["pyq-tests"],
    queryFn: () => testService.getTests({ paperType: "previous_year" }),
  });
  const pyqs = unwrapList<any>(testsRes);

  const toggleBookmark = (id: string) => {
    setBookmarks((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id]));
  };

  const years = useMemo(() => {
    const map = new Map<number, number>();
    pyqs.forEach((p) => {
      if (!p.examDate) return;
      const y = new Date(p.examDate).getFullYear();
      map.set(y, (map.get(y) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [pyqs]);

  const filtered = useMemo(() => {
    return pyqs.filter((p) => {
      if (testSeries !== "all" && p.testSeries !== testSeries) return false;
      if (year !== "all" && p.examDate && String(new Date(p.examDate).getFullYear()) !== year) return false;
      if (year !== "all" && !p.examDate) return false;
      return true;
    });
  }, [pyqs, testSeries, year]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const popular = useMemo(
    () => [...pyqs].sort((a, b) => (b.attemptsCount ?? 0) - (a.attemptsCount ?? 0)).slice(0, 3),
    [pyqs],
  );

  const totalQuestions = pyqs.reduce((s, p) => s + (p.totalQuestions ?? 0), 0);
  const totalAttempts = pyqs.reduce((s, p) => s + (p.attemptsCount ?? 0), 0);
  const latestYear = years.length ? years[0][0] : null;

  const stats = [
    { value: String(pyqs.length), label: "PYQs Available", icon: FileText, tint: "bg-blue-50 text-blue-600" },
    { value: String(years.length), label: "Years Covered", icon: CalendarDays, tint: "bg-emerald-50 text-emerald-600" },
    { value: formatCount(totalQuestions), label: "Questions", icon: ClipboardList, tint: "bg-violet-50 text-violet-600" },
    { value: formatCount(totalAttempts), label: "Students Practicing", icon: Users, tint: "bg-orange-50 text-orange-600" },
  ];

  const resetFilters = () => {
    setTestSeries("all");
    setYear("all");
    setPage(1);
  };

  const start = async (testId: string) => {
    setStarting(testId);
    try {
      await testAttemptService.startTest(testId);
      navigate({ to: "/test/$testId", params: { testId } });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not start test");
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="flex gap-6">
      {/* Main column */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Header + Stats */}
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div>
            <h1 className="text-2xl font-display font-extrabold flex items-center gap-2 text-foreground">
              Previous Year Papers
              <FileText className="h-5 w-5 text-primary" />
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Solve previous year papers to understand the exam pattern and boost your preparation.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -2 }}
              >
                <Card className="px-4 py-3 flex items-center gap-3 shadow-sm border-border/60">
                  <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${s.tint}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-bold leading-tight">{s.value}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{s.label}</div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <Filter label="Select Test Series" value={testSeries} onChange={(v) => { setTestSeries(v); setPage(1); }}
              options={[{ v: "all", l: "All Test Series" }, ...allSeries.map((s) => ({ v: s._id, l: s.name }))]} />
            <Filter label="Select Year" value={year} onChange={(v) => { setYear(v); setPage(1); }}
              options={[{ v: "all", l: "All Years" }, ...years.map(([y]) => ({ v: String(y), l: String(y) }))]} />
            <Button variant="outline" onClick={resetFilters} className="text-primary border-primary/40 hover:bg-primary/5">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        </Card>

        {/* Table */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-display font-bold">All Papers ({filtered.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Paper Details</th>
                  <th className="px-3 py-3 font-medium text-center">Questions</th>
                  <th className="px-3 py-3 font-medium text-center">Marks</th>
                  <th className="px-3 py-3 font-medium text-center">Duration</th>
                  <th className="px-3 py-3 font-medium text-center">Attempts</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={6} className="text-center text-sm text-muted-foreground py-12">Loading papers…</td></tr>
                )}
                {!isLoading && paged.map((p, i) => {
                  const tint = ICON_TINTS[i % ICON_TINTS.length];
                  const bookmarked = bookmarks.includes(p._id);
                  const paperYear = p.examDate ? new Date(p.examDate).getFullYear() : null;
                  const isLatest = latestYear !== null && paperYear === latestYear;
                  const seriesName = seriesNameById.get(p.testSeries);
                  return (
                    <tr key={p._id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${tint}`}>
                            <ClipboardList className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground">{p.title}</span>
                              {isLatest && (
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0 text-[10px] px-2 py-0">Latest</Badge>
                              )}
                              {seriesName && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0">{seriesName}</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(p.examDate)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <div className="font-semibold">{p.totalQuestions ?? 0}</div>
                        <div className="text-[11px] text-muted-foreground">Questions</div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <div className="font-semibold">{p.totalMarks ?? 0}</div>
                        <div className="text-[11px] text-muted-foreground">Marks</div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <div className="font-semibold">{p.duration ?? 0}</div>
                        <div className="text-[11px] text-muted-foreground">Mins</div>
                      </td>
                      <td className="px-3 py-4 text-center font-medium">{formatCount(p.attemptsCount ?? 0)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                            disabled={starting === p._id}
                            onClick={() => start(p._id)}
                          >
                            <Play className="h-3.5 w-3.5 mr-1" /> {starting === p._id ? "Starting…" : "Start Test"}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-9 w-9"
                            onClick={() => toggleBookmark(p._id)}
                            aria-label="Bookmark"
                          >
                            <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-primary text-primary" : ""}`} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && paged.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-sm text-muted-foreground py-12">No papers match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-t border-border">
              <div className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} papers
              </div>
              <Pagination page={currentPage} total={totalPages} onChange={setPage} />
            </div>
          )}
        </Card>
      </div>

      {/* Right sidebar */}
      <aside className="hidden xl:flex flex-col gap-4 w-[280px] shrink-0">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Years Covered</h3>
          </div>
          <ul className="space-y-2">
            {years.slice(0, 10).map(([y, c]) => (
              <li key={y}>
                <button
                  onClick={() => { setYear(String(y)); setPage(1); }}
                  className="w-full flex items-center justify-between text-sm py-1.5 px-2 rounded-md hover:bg-muted transition-colors"
                >
                  <span>{y}</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10 font-medium">{c}</Badge>
                </button>
              </li>
            ))}
            {years.length === 0 && (
              <li className="text-xs text-muted-foreground">No papers yet.</li>
            )}
          </ul>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-orange-500" />
            <h3 className="font-semibold text-sm">Popular Papers</h3>
          </div>
          <ul className="space-y-3">
            {popular.map((p) => (
              <li key={p._id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                <div className="text-sm font-medium leading-tight">{p.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{formatCount(p.attemptsCount ?? 0)} Attempts</div>
              </li>
            ))}
            {popular.length === 0 && (
              <li className="text-xs text-muted-foreground">No data yet.</li>
            )}
          </ul>
        </Card>
      </aside>
    </div>
  );
}

function Filter({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages: (number | "…")[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, 2, 3);
    if (page > 4) pages.push("…");
    pages.push(total - 1, total);
  }
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-2 text-muted-foreground text-sm">…</span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="icon"
            className="h-8 w-8 text-xs"
            onClick={() => onChange(p)}
          >
            {p}
          </Button>
        ),
      )}
      <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === total} onClick={() => onChange(page + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
