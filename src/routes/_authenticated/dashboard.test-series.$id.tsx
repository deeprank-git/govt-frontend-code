import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutGrid, ClipboardList, FileText, Clock, BookOpenCheck, ShieldAlert,
  Trophy, ExternalLink, Globe, Bell, Download, BarChart3, ArrowLeft,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExamIcon } from "@/components/site/ExamIcon";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type SeriesSearch = { name?: string; category?: string };

export const Route = createFileRoute("/_authenticated/dashboard/test-series/$id")({
  validateSearch: (search: Record<string, unknown>): SeriesSearch => {
    const result: SeriesSearch = {};
    if (typeof search.name === "string") result.name = search.name;
    if (typeof search.category === "string") result.category = search.category;
    return result;
  },
  component: TestSeriesDetailPage,
});

// No backend endpoint exists yet for per-series mock tests / previous year
// papers — this page is fully static/dummy content until that resource is
// added to the API. Only the header (name/category) reflects the real
// TestSeries the user clicked, passed in via search params.
const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "mocks", label: "Mock Test", icon: ClipboardList },
  { id: "pyp", label: "Previous Year Question Paper", icon: FileText },
] as const;

const FULL_MOCK_TESTS = [
  { id: "m1", title: "Full Mock Test 1", questions: 100, marks: 200, duration: 60, attempts: "15.2K" },
  { id: "m2", title: "Full Mock Test 2", questions: 100, marks: 200, duration: 60, attempts: "9.8K" },
  { id: "m3", title: "Full Mock Test 3", questions: 100, marks: 200, duration: 60, attempts: "7.1K" },
  { id: "m4", title: "Full Mock Test 4", questions: 100, marks: 200, duration: 60, attempts: "5.6K" },
];

const PYQ_PAPERS = [
  { id: "p1", title: "12 Sep 2025, Shift 1", date: "12 Sep 2025 (Fri)", questions: 100, marks: 200, duration: 60 },
  { id: "p2", title: "12 Sep 2025, Shift 2", date: "12 Sep 2025 (Fri)", questions: 100, marks: 200, duration: 60 },
  { id: "p3", title: "12 Sep 2025, Shift 3", date: "12 Sep 2025 (Fri)", questions: 100, marks: 200, duration: 60 },
  { id: "p4", title: "13 Sep 2025, Shift 1", date: "13 Sep 2025 (Sat)", questions: 100, marks: 200, duration: 60 },
];

const PROGRESS = { attempted: 12, best: 156, average: 128, total: 200 };

const QUICK_LINKS = [
  { label: "Official Website", icon: Globe },
  { label: "Latest Notification", icon: Bell },
  { label: "Syllabus (PDF)", icon: Download },
  { label: "Exam Pattern (PDF)", icon: Download },
  { label: "Previous Year Papers", icon: FileText },
  { label: "Cut Off Marks", icon: BarChart3 },
];

function TestSeriesDetailPage() {
  const { name, category } = Route.useSearch();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<(typeof NAV_ITEMS)[number]["id"]>("overview");
  const { setOpen } = useSidebar();

  // Collapse the main dashboard sidebar to icon-only while this page is
  // open — it has its own scoped nav (Overview / Mock Test / PYQ) — and
  // restore it when the user navigates away.
  useEffect(() => {
    setOpen(false);
    return () => setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = name ?? "Test Series";
  const goToTests = () => navigate({ to: "/dashboard/mock-tests" });

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => navigate({ to: "/dashboard/overview" })}
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Categories
      </Button>

      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)_260px] gap-4 items-start">
      {/* Scoped mini sidebar */}
      <Card className="p-4 h-fit">
        <div className="flex items-center gap-3">
          <ExamIcon name={displayName} className="h-11 w-11 text-sm shrink-0" />
          <div className="min-w-0">
            <div className="font-display font-bold text-sm truncate">{displayName}</div>
            {category && <div className="text-xs text-muted-foreground truncate">{category}</div>}
          </div>
        </div>
        <nav className="mt-4 -mx-1 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left transition-colors",
                  active ? "bg-primary/10 text-primary font-semibold" : "text-foreground/80 hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </Card>

      {/* Center content */}
      <div className="space-y-5 min-w-0">
        <Card className="p-5 lg:p-6">
          <div className="flex items-start gap-4 min-w-0 flex-wrap">
            <ExamIcon name={displayName} className="h-14 w-14 text-base shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-display font-extrabold">{displayName}</h1>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-transparent">
                  Tier 1
                </Badge>
              </div>
              {category && <p className="text-sm text-muted-foreground mt-1">{category}</p>}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Questions", value: "100", icon: BookOpenCheck },
              { label: "Duration", value: "60 Min", icon: Clock },
              { label: "Negative Marking", value: "0.50", icon: ShieldAlert },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                  <f.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{f.label}</div>
                  <div className="text-sm font-semibold truncate">{f.value}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {activeSection === "overview" && (
          <Card className="p-5 lg:p-6">
            <h2 className="font-display font-bold text-lg mb-2">About this Test Series</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Practice with full length mock tests and previous year papers designed to match the real
              exam pattern. Track your attempts, review your scores, and keep improving with every test.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => setActiveSection("mocks")}>
                <ClipboardList className="h-4 w-4 mr-1.5" /> Browse Mock Tests
              </Button>
              <Button variant="outline" onClick={() => setActiveSection("pyp")}>
                <FileText className="h-4 w-4 mr-1.5" /> Browse Previous Year Papers
              </Button>
            </div>
          </Card>
        )}

        {activeSection === "mocks" && (
          <Card className="p-5 lg:p-6">
            <h2 className="font-display font-bold text-lg mb-4">Full Length Mock Tests</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {FULL_MOCK_TESTS.map((t) => (
                <div key={t.id} className="rounded-lg border border-border p-4">
                  <Badge variant="outline" className="text-[10px] mb-2">FULL MOCK</Badge>
                  <div className="font-semibold text-sm">{displayName} {t.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t.questions} Questions · {t.marks} Marks</div>
                  <div className="text-xs text-muted-foreground">{t.duration} Minutes · {t.attempts} Attempts</div>
                  <Button size="sm" className="w-full mt-3" onClick={goToTests}>Start Test →</Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeSection === "pyp" && (
          <Card className="p-5 lg:p-6">
            <h2 className="font-display font-bold text-lg mb-4">Previous Year Question Papers</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {PYQ_PAPERS.map((p) => (
                <div key={p.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{p.date}</span>
                    <Badge className="bg-success/15 text-success-foreground border-transparent text-[10px]">FREE</Badge>
                  </div>
                  <div className="font-semibold text-sm mt-1">{displayName} — {p.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{p.questions} Questions · {p.marks} Marks</div>
                  <div className="text-xs text-muted-foreground">{p.duration} Mins</div>
                  <Button size="sm" variant="outline" className="w-full mt-3" onClick={goToTests}>Start Now</Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Right panel */}
      <aside className="space-y-4">
        <Card className="p-4">
          <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" /> Your Progress
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Mocks Attempted</span>
              <span className="font-semibold">{PROGRESS.attempted}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Best Score</span>
              <span className="font-semibold">{PROGRESS.best} / {PROGRESS.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Average Score</span>
              <span className="font-semibold">{PROGRESS.average} / {PROGRESS.total}</span>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full mt-4" onClick={() => navigate({ to: "/dashboard/attempted-tests" })}>
            View Analytics
          </Button>
        </Card>

        <Card className="p-4">
          <h3 className="font-display font-bold text-sm mb-3">Quick Links</h3>
          <ul className="space-y-1">
            {QUICK_LINKS.map(({ label, icon: Icon }) => (
              <li key={label}>
                <a href="#" className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted transition-colors">
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-primary" />
                    {label}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </aside>
      </div>
    </div>
  );
}
