import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
<<<<<<< API-integration-2-AS
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ClipboardList,
  Target,
  Trophy,
  TrendingUp,
  RefreshCw,
  CalendarIcon,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as testAttemptService from "@/services/testAttemptService";
import * as categoryService from "@/services/categoryService";
import * as testService from "@/services/testService";
=======
import { ClipboardList, CheckCircle2, Clock3, ChevronLeft, ChevronRight } from "lucide-react";
import * as testAttemptService from "@/services/testAttemptService";
>>>>>>> main
import { unwrapList } from "@/lib/api-unwrap";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard/attempted-tests")({
  component: AttemptedTests,
});

<<<<<<< API-integration-2-AS
function AttemptedTests() {
  const [category, setCategory] = useState("all");
  const [range, setRange] = useState<DateRange | undefined>();
=======
// NOTE: GET /test-attempts/my-attempts is documented as a lightweight list
// (test name, score, status, dates) — it doesn't include the per-attempt
// percentile/accuracy/difficulty/exam breakdown the original Supabase-backed
// page showed, so those stat cards, filters, and the pie chart were dropped
// here rather than fabricated. They can come back once/if the backend adds
// that data to this endpoint.

type AttemptLite = {
  _id?: string;
  id?: string;
  test?: { id?: string; _id?: string; title?: string };
  testId?: string;
  testTitle?: string;
  score?: number;
  status?: string;
  startedAt?: string;
  completedAt?: string;
};

function AttemptedTests() {
>>>>>>> main
  const [page, setPage] = useState(1);
  const pageSize = 8;

<<<<<<< API-integration-2-AS
  const { data: attemptsRes } = useQuery({
    queryKey: ["attended"],
    queryFn: () => testAttemptService.getMyAttempts(),
=======
  const { data: attempts = [] } = useQuery({
    queryKey: ["my-attempts"],
    queryFn: async () => unwrapList<AttemptLite>(await testAttemptService.getMyAttempts()),
>>>>>>> main
  });
  const attempts = unwrapList<any>(attemptsRes);

<<<<<<< API-integration-2-AS
  const { data: categoriesRes } = useQuery({
    queryKey: ["exam-options"],
    queryFn: () => categoryService.getCategories(),
  });
  const categories = unwrapList<any>(categoriesRes);

  const { data: testsRes } = useQuery({
    queryKey: ["attended-tests-lookup"],
    queryFn: () => testService.getTests(),
  });
  const testCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    unwrapList<any>(testsRes).forEach((t) => map.set(t._id, t.category));
    return map;
  }, [testsRes]);

  const completed = attempts.filter((a) => a.status === "completed" || a.status === "auto-submitted");
  const total = attempts.length;
  const accuracyOf = (a: any) => {
    const answered = (a.correctCount ?? 0) + (a.wrongCount ?? 0);
    return answered ? (a.correctCount / answered) * 100 : 0;
  };
  const avg = completed.length
    ? Math.round((completed.reduce((s, a) => s + accuracyOf(a), 0) / completed.length) * 10) / 10
    : 0;
  const best = completed.length
    ? Math.max(...completed.map((a) => (a.test?.totalMarks ? Math.round((Number(a.score) / Number(a.test.totalMarks)) * 1000) / 10 : 0)))
    : 0;

  const sorted = [...completed].sort((a, b) => +new Date(a.submittedAt || a.startedAt) - +new Date(b.submittedAt || b.startedAt));
  const recent = sorted.slice(-5);
  const previous = sorted.slice(-10, -5);
  const recentAvg = recent.length ? recent.reduce((s, a) => s + accuracyOf(a), 0) / recent.length : 0;
  const prevAvg = previous.length ? previous.reduce((s, a) => s + accuracyOf(a), 0) / previous.length : recentAvg;
  const improvement = previous.length ? Math.round((recentAvg - prevAvg) * 10) / 10 : 0;

  const filtered = useMemo(() => {
    return attempts.filter((a) => {
      if (category !== "all" && testCategoryMap.get(a.test?._id) !== category) return false;
      if (range?.from) {
        const d = new Date(a.startedAt);
        if (d < range.from) return false;
        if (range.to && d > range.to) return false;
      }
      return true;
    });
  }, [attempts, category, range, testCategoryMap]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const reset = () => {
    setCategory("all");
    setRange(undefined);
  };

  const stats = [
    { label: "Total Tests", value: total, sub: "Tests Attempted", icon: ClipboardList, tint: "from-blue-500/10 to-blue-500/5", iconClr: "text-blue-600" },
    { label: "Avg Accuracy", value: `${avg}%`, sub: "Average Accuracy", icon: Target, tint: "from-emerald-500/10 to-emerald-500/5", iconClr: "text-emerald-600" },
    { label: "Highest Score", value: `${best}%`, sub: best ? "Best Performance" : "—", icon: Trophy, tint: "from-violet-500/10 to-violet-500/5", iconClr: "text-violet-600" },
    { label: "Improvement", value: `${improvement >= 0 ? "+" : ""}${improvement}%`, sub: "Recent vs Previous", icon: TrendingUp, tint: "from-amber-500/10 to-amber-500/5", iconClr: "text-amber-600" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-5">
=======
  const completed = attempts.filter((a) => (a.status ?? "").toLowerCase() === "completed");
  const inProgress = attempts.filter((a) => (a.status ?? "").toLowerCase() !== "completed");

  const sorted = useMemo(
    () =>
      [...attempts].sort(
        (a, b) =>
          +new Date(b.completedAt ?? b.startedAt ?? 0) -
          +new Date(a.completedAt ?? a.startedAt ?? 0),
      ),
    [attempts],
  );

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageItems = sorted.slice((page - 1) * pageSize, page * pageSize);

  const stats = [
    {
      label: "Total Tests",
      value: attempts.length,
      icon: ClipboardList,
      tint: "from-blue-500/10 to-blue-500/5",
      iconClr: "text-blue-600",
    },
    {
      label: "Completed",
      value: completed.length,
      icon: CheckCircle2,
      tint: "from-emerald-500/10 to-emerald-500/5",
      iconClr: "text-emerald-600",
    },
    {
      label: "In Progress",
      value: inProgress.length,
      icon: Clock3,
      tint: "from-amber-500/10 to-amber-500/5",
      iconClr: "text-amber-600",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
>>>>>>> main
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-extrabold">Attended Tests</h1>
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Review all the tests you have attempted.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 xl:flex-1 xl:max-w-xl">
          {stats.map((s) => (
            <Card key={s.label} className="p-3 flex items-center gap-3 shadow-sm">
              <div
                className={cn(
                  "h-11 w-11 rounded-xl bg-gradient-to-br grid place-items-center",
                  s.tint,
                )}
              >
                <s.icon className={cn("h-5 w-5", s.iconClr)} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
                <div className="font-display font-extrabold text-lg leading-tight">{s.value}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>

<<<<<<< API-integration-2-AS
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Select Category</label>
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c: any) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="mt-1 w-full justify-start font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {range?.from
                    ? range.to
                      ? `${format(range.from, "dd MMM")} – ${format(range.to, "dd MMM yyyy")}`
                      : format(range.from, "dd MMM yyyy")
                    : "Pick date range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
          </div>
          <Button variant="outline" className="text-primary border-primary/30 hover:bg-primary/5" onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" /> Reset Filters
          </Button>
=======
      <Card className="overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/30">
          <div className="col-span-5">Test</div>
          <div className="col-span-2">Score</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-1 text-right">Action</div>
>>>>>>> main
        </div>

<<<<<<< API-integration-2-AS
      <Card className="overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/30">
          <div className="col-span-4">Test Details</div>
          <div className="col-span-2">Score</div>
          <div className="col-span-2">Accuracy</div>
          <div className="col-span-2">Attempt Date</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        <div className="divide-y divide-border">
          {pageItems.map((a: any) => {
            const scorePct = a.test?.totalMarks ? Math.round((Number(a.score) / Number(a.test.totalMarks)) * 1000) / 10 : 0;
            return (
              <motion.div
                key={a._id}
                whileHover={{ backgroundColor: "hsl(var(--muted) / 0.4)" }}
                className="grid grid-cols-12 gap-3 items-center px-4 py-3 text-sm"
              >
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg grid place-items-center shrink-0 bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{a.test?.title ?? "Test"}</div>
                    <div className="text-[11px] text-muted-foreground">{a.test?.totalMarks ?? 0} Marks</div>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="font-semibold">{a.score}/{a.test?.totalMarks ?? 0}</div>
                  <div className="text-[11px] text-emerald-600 font-medium">{scorePct}%</div>
                </div>
                <div className="col-span-2 font-medium">{accuracyOf(a).toFixed(1)}%</div>
                <div className="col-span-2">
                  <div className="font-medium">{format(new Date(a.submittedAt || a.startedAt), "dd MMM yyyy")}</div>
                  <div className="text-[11px] text-muted-foreground">{format(new Date(a.submittedAt || a.startedAt), "hh:mm a")}</div>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  {a.status !== "in-progress" ? (
                    <Button size="sm" variant="ghost" className="text-primary hover:text-primary h-8 px-2" asChild>
                      <Link to="/result/$attemptId" params={{ attemptId: a._id }}>View Analysis</Link>
                    </Button>
                  ) : (
                    <Button size="sm" className="h-8 px-2" asChild>
                      <Link to="/test/$testId" params={{ testId: a.test?._id }}>Resume</Link>
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-16">No attempted tests match these filters.</div>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
            <div>Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} tests</div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-7 w-7" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
=======
        <div className="divide-y divide-border">
          {pageItems.map((a: AttemptLite) => {
            const id = (a._id ?? a.id)!;
            const status = (a.status ?? "in-progress").toLowerCase();
            const isCompleted = status === "completed";
            const testTitle = a.test?.title ?? a.testTitle ?? "Test";
            const testId = (a.test?.id ?? a.test?._id ?? a.testId)!;
            const date = a.completedAt ?? a.startedAt;
            return (
              <div key={id} className="grid grid-cols-12 gap-3 items-center px-4 py-3 text-sm">
                <div className="col-span-5 font-semibold truncate">{testTitle}</div>
                <div className="col-span-2">{a.score != null ? a.score : "—"}</div>
                <div className="col-span-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize text-[11px]",
                      isCompleted
                        ? "border-success/40 text-success-foreground bg-success/10"
                        : "border-warning/40 text-warning-foreground bg-warning/10",
                    )}
                  >
                    {status.replace("-", " ")}
                  </Badge>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {date ? format(new Date(date), "dd MMM yyyy") : "—"}
                </div>
                <div className="col-span-1 flex justify-end">
                  {isCompleted ? (
                    <Button size="sm" variant="ghost" className="text-primary h-8 px-2" asChild>
                      <Link to="/result/$attemptId" params={{ attemptId: id }}>
                        View
                      </Link>
                    </Button>
                  ) : (
                    <Button size="sm" className="h-8 px-2" asChild>
                      <Link to="/test/$testId" params={{ testId }}>
                        Resume
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-16">
              You haven't attempted any tests yet.
            </div>
          )}
        </div>

        {sorted.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
            <div>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, sorted.length)} of{" "}
              {sorted.length} tests
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
>>>>>>> main
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {Array.from({ length: Math.min(pageCount, 5) }).map((_, i) => {
                const n = i + 1;
                return (
<<<<<<< API-integration-2-AS
                  <Button key={n} size="icon" variant={page === n ? "default" : "outline"} className="h-7 w-7 text-xs" onClick={() => setPage(n)}>
=======
                  <Button
                    key={n}
                    size="icon"
                    variant={page === n ? "default" : "outline"}
                    className="h-7 w-7 text-xs"
                    onClick={() => setPage(n)}
                  >
>>>>>>> main
                    {n}
                  </Button>
                );
              })}
<<<<<<< API-integration-2-AS
              <Button size="icon" variant="outline" className="h-7 w-7" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>
=======
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                disabled={page === pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
>>>>>>> main
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
