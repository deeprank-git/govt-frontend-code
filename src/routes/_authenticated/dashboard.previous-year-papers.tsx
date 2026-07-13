import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
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

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCount(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function PYQPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [exam, setExam] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [tier, setTier] = useState<string>("all");
  const [shift, setShift] = useState<string>("all");
  const [tab, setTab] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data: exams = [] } = useQuery({
    queryKey: ["exams-min"],
    queryFn: async () => (await supabase.from("exams").select("id,name,slug").order("name")).data ?? [],
  });

  const { data: pyqs = [] } = useQuery({
    queryKey: ["pyqs-all"],
    queryFn: async () =>
      (await supabase.from("pyqs").select("*").order("paper_date", { ascending: false })).data ?? [],
  });

  const { data: bookmarks = [] } = useQuery({
    queryKey: ["pyq-bookmarks", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookmarks")
        .select("item_id")
        .eq("user_id", user!.id)
        .eq("item_type", "pyq");
      return (data ?? []).map((b) => b.item_id);
    },
  });

  const bookmarkMut = useMutation({
    mutationFn: async (pyqId: string) => {
      if (!user) throw new Error("Sign in required");
      if (bookmarks.includes(pyqId)) {
        await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("item_type", "pyq").eq("item_id", pyqId);
      } else {
        await supabase.from("bookmarks").insert({ user_id: user.id, item_type: "pyq", item_id: pyqId });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pyq-bookmarks", user?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return pyqs.filter((p) => {
      if (exam !== "all" && p.exam_id !== exam) return false;
      if (year !== "all" && String(p.year) !== year) return false;
      if (tier !== "all" && (p.tier ?? "").toLowerCase() !== tier.toLowerCase()) return false;
      if (shift !== "all" && (p.shift ?? "").toLowerCase() !== shift.toLowerCase()) return false;
      if (tab !== "all" && (p.tier ?? "").toLowerCase() !== tab.toLowerCase()) return false;
      return true;
    });
  }, [pyqs, exam, year, tier, shift, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const years = useMemo(() => {
    const map = new Map<number, number>();
    pyqs.forEach((p) => map.set(p.year, (map.get(p.year) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [pyqs]);

  const popular = useMemo(
    () => [...pyqs].sort((a, b) => (b.attempts ?? 0) - (a.attempts ?? 0)).slice(0, 3),
    [pyqs],
  );

  const totalQuestions = pyqs.reduce((s, p) => s + (p.questions_count ?? 0), 0);
  const totalAttempts = pyqs.reduce((s, p) => s + (p.attempts ?? 0), 0);

  const stats = [
    { value: `${pyqs.length || 150}+`, label: "PYQs Available", icon: FileText, tint: "bg-blue-50 text-blue-600" },
    { value: `${years.length || 10}+`, label: "Years Covered", icon: CalendarDays, tint: "bg-emerald-50 text-emerald-600" },
    { value: `${totalQuestions ? (totalQuestions >= 1000 ? Math.round(totalQuestions / 1000) + ",000" : totalQuestions) : "25,000"}+`, label: "Questions", icon: ClipboardList, tint: "bg-violet-50 text-violet-600" },
    { value: `${totalAttempts ? formatCount(totalAttempts) : "85.7K"}+`, label: "Students Practicing", icon: Users, tint: "bg-orange-50 text-orange-600" },
  ];

  const resetFilters = () => {
    setExam("all"); setYear("all"); setTier("all"); setShift("all"); setTab("all"); setPage(1);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <Filter label="Select Exam" value={exam} onChange={(v) => { setExam(v); setPage(1); }}
              options={[{ v: "all", l: "All Exams" }, ...exams.map((e) => ({ v: e.id, l: e.name }))]} />
            <Filter label="Select Year" value={year} onChange={(v) => { setYear(v); setPage(1); }}
              options={[{ v: "all", l: "All Years" }, ...years.map(([y]) => ({ v: String(y), l: String(y) }))]} />
            <Filter label="Select Tier" value={tier} onChange={(v) => { setTier(v); setPage(1); }}
              options={[
                { v: "all", l: "All Tiers" },
                { v: "tier 1", l: "Tier 1" },
                { v: "tier 2", l: "Tier 2" },
                { v: "tier 3", l: "Tier 3" },
                { v: "tier 4", l: "Tier 4" },
              ]} />
            <Filter label="Select Shift" value={shift} onChange={(v) => { setShift(v); setPage(1); }}
              options={[
                { v: "all", l: "All Shifts" },
                { v: "shift 1", l: "Shift 1" },
                { v: "shift 2", l: "Shift 2" },
                { v: "shift 3", l: "Shift 3" },
              ]} />
            <Button variant="outline" onClick={resetFilters} className="text-primary border-primary/40 hover:bg-primary/5">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        </Card>

        {/* Tabs + Table */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 pt-2">
            <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
              <TabsList className="bg-transparent p-0 h-auto gap-6 border-b border-border w-full justify-start rounded-none">
                {[
                  { v: "all", l: "All Papers" },
                  { v: "tier 1", l: "Tier 1 Papers" },
                  { v: "tier 2", l: "Tier 2 Papers" },
                  { v: "tier 3", l: "Tier 3 Papers" },
                  { v: "tier 4", l: "Tier 4 Papers" },
                ].map((t) => (
                  <TabsTrigger
                    key={t.v}
                    value={t.v}
                    className="px-0 py-3 rounded-none bg-transparent text-muted-foreground data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-primary font-medium"
                  >
                    {t.l}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Paper Details</th>
                  <th className="px-3 py-3 font-medium text-center">Questions</th>
                  <th className="px-3 py-3 font-medium text-center">Marks</th>
                  <th className="px-3 py-3 font-medium text-center">Duration</th>
                  <th className="px-3 py-3 font-medium text-center">Shift</th>
                  <th className="px-3 py-3 font-medium text-center">Attempts</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p, i) => {
                  const tint = ICON_TINTS[i % ICON_TINTS.length];
                  const bookmarked = bookmarks.includes(p.id);
                  const isLatest = p.year === Math.max(...pyqs.map((x) => x.year));
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${tint}`}>
                            <ClipboardList className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{p.title}</span>
                              {isLatest && (
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0 text-[10px] px-2 py-0">Latest</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(p.paper_date)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <div className="font-semibold">{p.questions_count ?? 0}</div>
                        <div className="text-[11px] text-muted-foreground">Questions</div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <div className="font-semibold">{p.marks ?? 0}</div>
                        <div className="text-[11px] text-muted-foreground">Marks</div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <div className="font-semibold">{p.duration_minutes ?? 0}</div>
                        <div className="text-[11px] text-muted-foreground">Mins</div>
                      </td>
                      <td className="px-3 py-4 text-center text-sm">{p.shift ?? "—"}</td>
                      <td className="px-3 py-4 text-center font-medium">{formatCount(p.attempts ?? 0)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {p.test_id ? (
                            <Button asChild size="sm" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                              <Link to="/test/$testId" params={{ testId: p.test_id }}>
                                <Play className="h-3.5 w-3.5 mr-1" /> Start Test
                              </Link>
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" disabled>
                              <Play className="h-3.5 w-3.5 mr-1" /> Start Test
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-9 w-9"
                            onClick={() => bookmarkMut.mutate(p.id)}
                            aria-label="Bookmark"
                          >
                            <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-primary text-primary" : ""}`} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paged.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-sm text-muted-foreground py-12">No papers match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} papers
            </div>
            <Pagination page={currentPage} total={totalPages} onChange={setPage} />
          </div>
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
            {(years.length ? years : [2024,2023,2022,2021,2020,2019,2018,2017,2016,2015].map((y) => [y, 12] as [number, number])).slice(0, 10).map(([y, c]) => (
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
          </ul>
          <Button variant="outline" className="w-full mt-3 text-primary border-primary/40">View All Years</Button>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-orange-500" />
            <h3 className="font-semibold text-sm">Popular Papers</h3>
          </div>
          <ul className="space-y-3">
            {(popular.length ? popular : []).map((p) => (
              <li key={p.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                <div className="text-sm font-medium leading-tight">{p.title} {p.shift && `(${p.shift})`}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{formatCount(p.attempts ?? 0)} Attempts</div>
              </li>
            ))}
            {popular.length === 0 && (
              <li className="text-xs text-muted-foreground">No data yet.</li>
            )}
          </ul>
          <Button variant="outline" className="w-full mt-3 text-primary border-primary/40">View All</Button>
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
