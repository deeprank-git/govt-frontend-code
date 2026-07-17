import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  KeyRound,
  FileText,
  CalendarDays,
  ShieldAlert,
  Users,
  RotateCcw,
  Download,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Calendar,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/answer-key")({
  component: KeyPage,
});

const TABS = [
  { id: "latest", label: "Latest Answer Keys" },
  { id: "challenge", label: "Challenge Window Open" },
  { id: "upcoming", label: "Upcoming Answer Keys" },
  { id: "archive", label: "Answer Key Archive" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATS = [
  { icon: FileText, value: "128+", label: "Answer Keys Released", tint: "bg-blue-50 text-blue-600" },
  { icon: CalendarDays, value: "42", label: "Exams Covered", tint: "bg-emerald-50 text-emerald-600" },
  { icon: ShieldAlert, value: "18", label: "Challenge Windows Open", tint: "bg-violet-50 text-violet-600" },
  { icon: Users, value: "2.4L+", label: "Views Today", tint: "bg-amber-50 text-amber-600" },
];

const PAGE_SIZE = 5;

// No backend endpoint exists yet for answer keys — this page stays on static
// placeholder content until that resource is added to the API.
const EXAMS_LIST = [
  { id: "e1", name: "SSC CGL", short_name: "SSC CGL" },
  { id: "e2", name: "IBPS PO", short_name: "IBPS PO" },
];
const CATEGORIES_LIST = [
  { id: "c1", name: "SSC" },
  { id: "c2", name: "Banking" },
];
const KEYS_ALL = [
  { id: "k1", exam_id: "e1", title: "SSC CGL Tier 1 2024 Answer Key", released_on: new Date().toISOString(), challenge_open: true, tier: "Tier 1", exams: { name: "SSC CGL", short_name: "SSC CGL", conducting_body: "Staff Selection Commission", category_id: "c1" } },
  { id: "k2", exam_id: "e2", title: "IBPS PO Prelims 2024 Answer Key", released_on: new Date(Date.now() - 5 * 86400000).toISOString(), challenge_open: false, tier: "Prelims", exams: { name: "IBPS PO", short_name: "IBPS PO", conducting_body: "IBPS", category_id: "c2" } },
];

function KeyPage() {
  const [tab, setTab] = useState<TabId>("latest");
  const [category, setCategory] = useState("all");
  const [exam, setExam] = useState("all");
  const [year, setYear] = useState("all");
  const [stage, setStage] = useState("all");
  const [sort, setSort] = useState<"latest" | "oldest">("latest");
  const [page, setPage] = useState(1);

  const keys = KEYS_ALL;
  const exams = EXAMS_LIST;
  const categories = CATEGORIES_LIST;

  const filtered = useMemo(() => {
    let rows = [...keys];
    if (tab === "challenge") rows = rows.filter((r) => r.challenge_open);
    if (tab === "upcoming") rows = rows.filter((r) => !r.released_on || new Date(r.released_on) > new Date());
    if (tab === "archive") rows = rows.filter((r) => r.released_on && new Date(r.released_on) < new Date(Date.now() - 1000 * 60 * 60 * 24 * 60));
    if (category !== "all") rows = rows.filter((r: any) => r.exams?.category_id === category);
    if (exam !== "all") rows = rows.filter((r) => r.exam_id === exam);
    if (year !== "all") rows = rows.filter((r) => r.released_on?.startsWith(year));
    if (stage !== "all") rows = rows.filter((r) => (r.tier ?? "").toLowerCase().includes(stage.toLowerCase()));
    rows.sort((a, b) => {
      const av = a.released_on ? +new Date(a.released_on) : 0;
      const bv = b.released_on ? +new Date(b.released_on) : 0;
      return sort === "latest" ? bv - av : av - bv;
    });
    return rows;
  }, [keys, tab, category, exam, year, stage, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const featured = keys[0];
  const popular = keys.slice(0, 5);

  const bookmark = {
    mutate: (_id: string) => toast.success("Saved for later"),
  };

  const reset = () => {
    setCategory("all");
    setExam("all");
    setYear("all");
    setStage("all");
    setPage(1);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header + Stats */}
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold flex items-center gap-2">
            Answer Key <KeyRound className="h-5 w-5 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Get official answer keys, response sheets and challenge updates.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 xl:w-[640px]">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              whileHover={{ y: -2 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                <div className={`h-10 w-10 rounded-lg grid place-items-center ${s.tint}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display font-extrabold text-lg leading-none">{s.value}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{s.label}</div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <FilterField label="Exam Category">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Select Exam">
                <Select value={exam} onValueChange={setExam}>
                  <SelectTrigger><SelectValue placeholder="All Exams" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Exams</SelectItem>
                    {exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.short_name ?? e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Year">
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger><SelectValue placeholder="All Years" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {["2025", "2024", "2023", "2022"].map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Exam Stage">
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger><SelectValue placeholder="All Stages" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="Tier 1">Tier 1</SelectItem>
                    <SelectItem value="Tier 2">Tier 2</SelectItem>
                    <SelectItem value="Prelims">Prelims</SelectItem>
                    <SelectItem value="Mains">Mains</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
              <Button variant="outline" onClick={reset} className="text-primary border-primary/30">
                <RotateCcw className="h-4 w-4 mr-2" /> Reset Filters
              </Button>
            </div>
          </Card>

          {/* Tabs + List */}
          <Card>
            <div className="border-b border-border px-4">
              <div className="flex items-center gap-6 overflow-x-auto">
                {TABS.map((t) => {
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setTab(t.id); setPage(1); }}
                      className={`relative py-3 text-sm whitespace-nowrap transition-colors ${active ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {t.label}
                      {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="font-display font-bold">
                {TABS.find((t) => t.id === tab)?.label} <span className="text-muted-foreground font-normal">({filtered.length})</span>
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Sort by:</span>
                <Select value={sort} onValueChange={(v: any) => setSort(v)}>
                  <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Latest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="divide-y divide-border">
              {pageRows.map((k: any, idx) => {
                const isNew = idx < 2 && tab === "latest";
                const challenge = k.challenge_open;
                return (
                  <motion.div
                    key={k.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ backgroundColor: "hsl(var(--muted) / 0.4)" }}
                    className="px-4 py-4 flex flex-col lg:flex-row lg:items-center gap-4"
                  >
                    <div className="h-12 w-12 rounded-full bg-muted grid place-items-center shrink-0 border">
                      <span className="font-display font-bold text-xs text-primary">
                        {(k.exams?.short_name ?? "EX").slice(0, 4)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isNew && <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100">New</Badge>}
                        <span className="font-semibold">{k.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{k.exams?.conducting_body ?? k.exams?.name}</div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Released: {k.released_on ? new Date(k.released_on).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                        <span>{k.tier ?? "—"}</span>
                        <span>Q/A: 200</span>
                      </div>
                    </div>
                    <div>
                      {challenge ? (
                        <Badge className="bg-amber-100 text-amber-700 border-0 hover:bg-amber-100">Challenge Window Open</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100">Response Sheet Available</Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 lg:w-[180px]">
                      <Button asChild size="sm" variant="outline" className="text-primary border-primary/30 hover:bg-primary/5">
                        <Link to="/dashboard/answer-key" search={{ id: k.id } as any}>
                          <FileText className="h-3.5 w-3.5 mr-1.5" /> View Answer Key
                        </Link>
                      </Button>
                      {challenge ? (
                        <Button size="sm" variant="ghost" onClick={() => bookmark.mutate(k.id)}>Challenge Answer</Button>
                      ) : (
                        <Button size="sm" variant="ghost">View Response Sheet</Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              {pageRows.length === 0 && (
                <div className="p-12 text-center text-sm text-muted-foreground">No answer keys found.</div>
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((n) => (
                  <Button key={n} size="icon" variant={n === page ? "default" : "ghost"} className="h-8 w-8 text-xs" onClick={() => setPage(n)}>
                    {n}
                  </Button>
                ))}
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-display font-bold text-sm">Latest Answer Key</span>
              <Link to="/dashboard/answer-key" className="text-xs text-primary hover:underline">View All</Link>
            </div>
            {featured ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-muted grid place-items-center border">
                    <span className="text-[10px] font-bold text-primary">{(featured.exams?.short_name ?? "EX").slice(0, 3)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{featured.title}</span>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100 text-[10px] h-5">New</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{featured.exams?.conducting_body ?? featured.exams?.name}</div>
                  </div>
                </div>
                <div className="text-xs space-y-1.5 text-muted-foreground">
                  <div>Released: <span className="text-foreground">{featured.released_on ? new Date(featured.released_on).toLocaleDateString() : "—"}</span></div>
                  <div>{featured.tier ?? "Tier 1"} Exam</div>
                  <div>Questions: <span className="text-foreground">200</span> &nbsp;|&nbsp; Max Marks: <span className="text-foreground">200</span></div>
                  <div className="text-emerald-600 font-medium">Response Sheet: Available</div>
                  <div>Challenge Window:</div>
                  <div className="text-foreground">{featured.released_on ? new Date(featured.released_on).toLocaleDateString() : "—"} – {featured.released_on ? new Date(+new Date(featured.released_on) + 5 * 86400000).toLocaleDateString() : "—"}</div>
                </div>
                <Button className="w-full" size="sm">
                  <Download className="h-3.5 w-3.5 mr-1.5" /> View Answer Key (PDF)
                </Button>
                <Button variant="outline" className="w-full" size="sm">View Response Sheet</Button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No keys available.</div>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-display font-bold text-sm">Popular Exams</span>
              <Link to="/exams" className="text-xs text-primary hover:underline">View All</Link>
            </div>
            <ul className="space-y-3">
              {popular.map((p: any, i) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.title}</span>
                    {i < 3 && <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100 text-[10px] h-5">New</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{p.released_on ? new Date(p.released_on).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>
                </li>
              ))}
              {popular.length === 0 && <li className="text-xs text-muted-foreground">No exams.</li>}
            </ul>
          </Card>

          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-2">
              <HelpCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-display font-bold text-sm">How to Calculate Score?</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Use our score calculator to estimate your score instantly.
                </p>
              </div>
            </div>
            <Button variant="ghost" className="w-full mt-3 text-primary justify-between">
              Calculate Score <ChevronRight className="h-4 w-4" />
            </Button>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  );
}
