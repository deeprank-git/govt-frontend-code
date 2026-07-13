import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  ClipboardList,
  Target,
  Trophy,
  TrendingUp,
  RefreshCw,
  CalendarIcon,
  FileText,
  Calculator,
  Languages,
  History as HistoryIcon,
  Brain,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

export const Route = createFileRoute("/_authenticated/dashboard/attempted-tests")({
  component: AttemptedTests,
});

const TABS = ["All Tests", "Full Length Tests", "Sectional Tests", "Topic Tests", "PYQ Based Tests"] as const;
type TabKey = (typeof TABS)[number];

const TYPE_MAP: Record<string, TabKey> = {
  full_length: "Full Length Tests",
  sectional: "Sectional Tests",
  topic: "Topic Tests",
  pyq: "PYQ Based Tests",
  pyq_based: "PYQ Based Tests",
};

const TYPE_TINT: Record<string, { bg: string; text: string; icon: typeof FileText }> = {
  full_length: { bg: "bg-blue-50", text: "text-blue-600", icon: FileText },
  sectional: { bg: "bg-emerald-50", text: "text-emerald-600", icon: Calculator },
  topic: { bg: "bg-rose-50", text: "text-rose-600", icon: Brain },
  pyq: { bg: "bg-amber-50", text: "text-amber-600", icon: HistoryIcon },
  pyq_based: { bg: "bg-amber-50", text: "text-amber-600", icon: HistoryIcon },
  language: { bg: "bg-violet-50", text: "text-violet-600", icon: Languages },
};

const DIFF_CLR: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-700 border-transparent",
  medium: "bg-amber-100 text-amber-700 border-transparent",
  hard: "bg-rose-100 text-rose-700 border-transparent",
};

const PIE_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"];

function AttemptedTests() {
  const { user } = useAuth();
  const [exam, setExam] = useState("all");
  const [type, setType] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [range, setRange] = useState<DateRange | undefined>();
  const [tab, setTab] = useState<TabKey>("All Tests");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const { data: attempts = [] } = useQuery({
    queryKey: ["attended", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase
        .from("attempts")
        .select("*, mock_tests(title, test_type, total_marks, total_questions, duration_minutes, difficulty, exam_id, exams(name, slug))")
        .eq("user_id", user!.id)
        .order("started_at", { ascending: false })
      ).data ?? [],
  });

  const { data: exams = [] } = useQuery({
    queryKey: ["exam-options"],
    queryFn: async () => (await supabase.from("exams").select("id, name").order("name")).data ?? [],
  });

  const completed = attempts.filter((a) => a.status === "completed");
  const total = attempts.length;
  const avg = completed.length
    ? Math.round((completed.reduce((s, a) => s + Number(a.accuracy || 0), 0) / completed.length) * 10) / 10
    : 0;
  const best = completed.length
    ? Math.max(
        ...completed.map((a: any) =>
          a.mock_tests?.total_marks ? Math.round((Number(a.score) / Number(a.mock_tests.total_marks)) * 1000) / 10 : 0,
        ),
      )
    : 0;

  // Improvement: last 5 vs previous 5 accuracy
  const sorted = [...completed].sort((a, b) => +new Date((a as any).completed_at || a.started_at) - +new Date((b as any).completed_at || b.started_at));
  const recent = sorted.slice(-5);
  const previous = sorted.slice(-10, -5);
  const recentAvg = recent.length ? recent.reduce((s, a) => s + Number(a.accuracy || 0), 0) / recent.length : 0;
  const prevAvg = previous.length ? previous.reduce((s, a) => s + Number(a.accuracy || 0), 0) / previous.length : recentAvg;
  const improvement = previous.length ? Math.round((recentAvg - prevAvg) * 10) / 10 : Math.round(recentAvg * 0.2 * 10) / 10;

  const filtered = useMemo(() => {
    return attempts.filter((a: any) => {
      if (exam !== "all" && a.mock_tests?.exam_id !== exam) return false;
      if (type !== "all" && a.mock_tests?.test_type !== type) return false;
      if (difficulty !== "all" && a.mock_tests?.difficulty !== difficulty) return false;
      if (range?.from) {
        const d = new Date(a.started_at);
        if (d < range.from) return false;
        if (range.to && d > range.to) return false;
      }
      if (tab !== "All Tests") {
        const t = TYPE_MAP[a.mock_tests?.test_type ?? ""] ?? "All Tests";
        if (t !== tab) return false;
      }
      return true;
    });
  }, [attempts, exam, type, difficulty, range, tab]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Pie data — distribution of average accuracy by type
  const pieData = useMemo(() => {
    const buckets: Record<string, { name: string; vals: number[] }> = {
      full_length: { name: "Full Length Tests", vals: [] },
      sectional: { name: "Sectional Tests", vals: [] },
      topic: { name: "Topic Tests", vals: [] },
      pyq: { name: "PYQ Based Tests", vals: [] },
    };
    completed.forEach((a: any) => {
      const k = a.mock_tests?.test_type;
      if (k && buckets[k]) buckets[k].vals.push(Number(a.accuracy || 0));
    });
    return Object.values(buckets).map((b) => ({
      name: b.name,
      value: b.vals.length ? Math.round((b.vals.reduce((s, v) => s + v, 0) / b.vals.length) * 10) / 10 : 0,
    }));
  }, [completed]);

  const reset = () => {
    setExam("all");
    setType("all");
    setDifficulty("all");
    setRange(undefined);
  };

  const stats = [
    { label: "Total Tests", value: total, sub: "Tests Attempted", icon: ClipboardList, tint: "from-blue-500/10 to-blue-500/5", iconClr: "text-blue-600" },
    { label: "Percentile", value: `${avg}%`, sub: "Average Score", icon: Target, tint: "from-emerald-500/10 to-emerald-500/5", iconClr: "text-emerald-600" },
    { label: "Highest Score", value: `${best}%`, sub: best ? "Best Performance" : "—", icon: Trophy, tint: "from-violet-500/10 to-violet-500/5", iconClr: "text-violet-600" },
    { label: "Improvement", value: `${improvement >= 0 ? "+" : ""}${improvement}%`, sub: "Last 30 Days", icon: TrendingUp, tint: "from-amber-500/10 to-amber-500/5", iconClr: "text-amber-600" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-5">
      {/* Header + Stat cards */}
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-extrabold">Attended Tests</h1>
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Review all the tests you have attempted. Analyze your performance and track your progress.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 xl:flex-1 xl:max-w-3xl">
          {stats.map((s, i) => (
            <motion.div key={s.label} whileHover={{ y: -2 }} transition={{ duration: 0.2 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ transitionDelay: `${i * 40}ms` }}>
              <Card className="p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                <div className={cn("h-11 w-11 rounded-xl bg-gradient-to-br grid place-items-center", s.tint)}>
                  <s.icon className={cn("h-5 w-5", s.iconClr)} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-muted-foreground">{s.label}</div>
                  <div className="font-display font-extrabold text-lg leading-tight">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{s.sub}</div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Select Exam</label>
            <Select value={exam} onValueChange={(v) => { setExam(v); setPage(1); }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="All Exams" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {exams.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Test Type</label>
            <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full_length">Full Length</SelectItem>
                <SelectItem value="sectional">Sectional</SelectItem>
                <SelectItem value="topic">Topic</SelectItem>
                <SelectItem value="pyq">PYQ Based</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Difficulty Level</label>
            <Select value={difficulty} onValueChange={(v) => { setDifficulty(v); setPage(1); }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="All Levels" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
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
        </div>
      </Card>

      {/* Body */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <Card className="overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-border px-4 flex items-center gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => { setTab(t); setPage(1); }}
                  className={cn(
                    "px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                    active ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/30">
            <div className="col-span-3">Test Details</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-1">Difficulty</div>
            <div className="col-span-1">Score</div>
            <div className="col-span-1">Percentile</div>
            <div className="col-span-1">Accuracy</div>
            <div className="col-span-1">Time Taken</div>
            <div className="col-span-2">Attempt Date</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          <div className="divide-y divide-border">
            {pageItems.map((a: any) => {
              const tt = a.mock_tests?.test_type ?? "topic";
              const tint = TYPE_TINT[tt] ?? TYPE_TINT.topic;
              const Icon = tint.icon;
              const typeLabel = (TYPE_MAP[tt] ?? "Test").replace(" Tests", "");
              const scorePct = a.mock_tests?.total_marks
                ? Math.round((Number(a.score) / Number(a.mock_tests.total_marks)) * 1000) / 10
                : 0;
              const mins = Math.floor((a.time_taken_seconds ?? 0) / 60);
              const secs = (a.time_taken_seconds ?? 0) % 60;
              const dur = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m ${secs}s`;
              return (
                <motion.div
                  key={a.id}
                  whileHover={{ backgroundColor: "hsl(var(--muted) / 0.4)" }}
                  className="grid grid-cols-12 gap-3 items-center px-4 py-3 text-sm"
                >
                  <div className="col-span-3 flex items-center gap-3 min-w-0">
                    <div className={cn("h-10 w-10 rounded-lg grid place-items-center shrink-0", tint.bg)}>
                      <Icon className={cn("h-5 w-5", tint.text)} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate flex items-center gap-1.5">
                        {a.mock_tests?.title ?? "Test"}
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-normal">{typeLabel}</Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {a.mock_tests?.total_questions ?? 0} Questions · {a.mock_tests?.total_marks ?? 0} Marks
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1 text-xs">{typeLabel}</div>
                  <div className="col-span-1">
                    <Badge className={cn("capitalize text-[10px]", DIFF_CLR[a.mock_tests?.difficulty ?? "medium"])}>
                      {a.mock_tests?.difficulty ?? "Medium"}
                    </Badge>
                  </div>
                  <div className="col-span-1">
                    <div className="font-semibold">{a.score}/{a.mock_tests?.total_marks ?? 0}</div>
                    <div className="text-[11px] text-emerald-600 font-medium">{scorePct}%</div>
                  </div>
                  <div className="col-span-1 font-medium">{Number(a.percentile ?? 0).toFixed(2)}</div>
                  <div className="col-span-1 font-medium">{Number(a.accuracy ?? 0).toFixed(1)}%</div>
                  <div className="col-span-1 text-muted-foreground">{dur}</div>
                  <div className="col-span-2">
                    <div className="font-medium">{format(new Date((a as any).completed_at || a.started_at), "dd MMM yyyy")}</div>
                    <div className="text-[11px] text-muted-foreground">{format(new Date((a as any).completed_at || a.started_at), "hh:mm a")}</div>
                  </div>
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    {a.status === "completed" ? (
                      <Button size="sm" variant="ghost" className="text-primary hover:text-primary h-8 px-2" asChild>
                        <Link to="/result/$attemptId" params={{ attemptId: a.id }}>View Analysis</Link>
                      </Button>
                    ) : (
                      <Button size="sm" className="h-8 px-2" asChild>
                        <Link to="/test/$testId" params={{ testId: a.test_id }}>Resume</Link>
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to="/test/$testId" params={{ testId: a.test_id }}>Retake Test</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>Share</DropdownMenuItem>
                        <DropdownMenuItem>Download Report</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-16">No attempted tests match these filters.</div>
            )}
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
              <div>Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} tests</div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-7 w-7" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {Array.from({ length: Math.min(pageCount, 5) }).map((_, i) => {
                  const n = i + 1;
                  return (
                    <Button key={n} size="icon" variant={page === n ? "default" : "outline"} className="h-7 w-7 text-xs" onClick={() => setPage(n)}>
                      {n}
                    </Button>
                  );
                })}
                <Button size="icon" variant="outline" className="h-7 w-7" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-5">
          <Card className="p-4">
            <h3 className="font-display font-bold text-sm mb-3">Performance Overview</h3>
            <div className="relative h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3} stroke="none" startAngle={90} endAngle={-270}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center">
                  <div className="text-xl font-display font-extrabold">{avg}%</div>
                  <div className="text-[10px] text-muted-foreground">Average Score</div>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                    <span>{d.name}</span>
                  </div>
                  <span className="font-semibold">{d.value}%</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-display font-bold text-sm mb-3">Recent Improvement</h3>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 grid place-items-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-lg font-display font-extrabold text-emerald-600">
                  {improvement >= 0 ? "+" : ""}{improvement}%
                </div>
                <div className="text-[11px] text-muted-foreground">Improvement in average score in last 30 days</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
