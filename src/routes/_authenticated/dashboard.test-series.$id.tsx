import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutGrid, ClipboardList, FileText,
  Trophy, ExternalLink, Globe, Download, ArrowLeft,
  CheckCircle2, FileSignature, IdCard, ScrollText,
  Landmark, User, BookOpen, Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExamIcon } from "@/components/site/ExamIcon";
import { useSidebar } from "@/components/ui/sidebar";
import * as mediaService from "@/services/mediaService";
import * as testSeriesService from "@/services/testSeriesService";
import * as testService from "@/services/testService";
import { unwrapItem, unwrapList } from "@/lib/api-unwrap";
import { cn } from "@/lib/utils";

type SeriesApiData = {
  name: string;
  description?: string;
  image?: string;
  officialWebsite?: string;
  applyLink?: string;
  notificationPdf?: string;
  importantDates?: Record<string, { from: string; to: string }>;
};

// Pinned locale (not `undefined`) so this renders identically during SSR and
// client hydration — see the homepage hydration-mismatch fix for the same reason.
const formatImportantDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

type SeriesSearch = { name?: string; category?: string; image?: string; description?: string };

export const Route = createFileRoute("/_authenticated/dashboard/test-series/$id")({
  validateSearch: (search: Record<string, unknown>): SeriesSearch => {
    const result: SeriesSearch = {};
    if (typeof search.name === "string") result.name = search.name;
    if (typeof search.category === "string") result.category = search.category;
    if (typeof search.image === "string") result.image = search.image;
    if (typeof search.description === "string") result.description = search.description;
    return result;
  },
  component: TestSeriesDetailPage,
});

// Mock Test / Previous Year Question Paper tabs both list real Tests for
// this series, split by Test.paperType ("mock" vs "previous_year"). Header
// links, Quick Links and Important Dates come from the real TestSeries doc.
// Eligibility / Exam Pattern / Syllabus have no backing API yet and stay static.
const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "mocks", label: "Mock Test", icon: ClipboardList },
  { id: "pyp", label: "Previous Year Question Paper", icon: FileText },
] as const;

const IMPORTANT_DATES_CONFIG = [
  { key: "notification_date", label: "Notification", icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-600" },
  { key: "application_start", label: "Application Start", icon: FileSignature, tint: "bg-blue-50 text-blue-600" },
  { key: "last_date_to_apply", label: "Last Date to Apply", icon: ClipboardList, tint: "bg-amber-50 text-amber-600" },
  { key: "admit_card", label: "Admit Card", icon: IdCard, tint: "bg-violet-50 text-violet-600" },
  { key: "tier_1_exam", label: "Tier 1 Exam", icon: ScrollText, tint: "bg-rose-50 text-rose-600" },
  { key: "tier_1_result", label: "Tier 1 Result", icon: Trophy, tint: "bg-slate-50 text-slate-600" },
];

const EXAM_DETAIL_SECTIONS = [
  {
    id: "eligibility",
    title: "Eligibility",
    description: "Nationality, Age Limit, Qualification, Age Relaxation and other eligibility criteria.",
    icon: User,
    tint: "bg-blue-50 text-blue-600",
  },
  {
    id: "pattern",
    title: "Exam Pattern",
    description: "Subjects, Number of Questions, Marks, Duration, Negative Marking and other details.",
    icon: ClipboardList,
    tint: "bg-emerald-50 text-emerald-600",
  },
  {
    id: "syllabus",
    title: "Syllabus",
    description: "Subject-wise detailed syllabus and topics to be covered in the exam.",
    icon: BookOpen,
    tint: "bg-violet-50 text-violet-600",
  },
];

// hrefs for officialWebsite/applyLink/notificationPdf are filled in at render
// time from the fetched series doc.
const QUICK_LINKS_CONFIG = [
  { label: "Official Website", icon: Globe, key: "officialWebsite" as const },
  { label: "Apply Online", icon: ExternalLink, key: "applyLink" as const },
  { label: "Download Syllabus", icon: Download, key: "notificationPdf" as const },
];

function TestSeriesDetailPage() {
  const { id } = Route.useParams();
  const { name, category, image, description } = Route.useSearch();
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

  const { data: seriesRes } = useQuery({
    queryKey: ["series-detail", id],
    queryFn: () => testSeriesService.getTestSeriesById(id),
  });
  const series = unwrapItem<SeriesApiData>(seriesRes);

  const { data: testsRes, isLoading: testsLoading } = useQuery({
    queryKey: ["series-tests", id],
    queryFn: () => testService.getTests({ testSeries: id }),
  });
  const tests = unwrapList<any>(testsRes);
  const mockTests = tests.filter((t) => t.paperType !== "previous_year");
  const pypTests = tests.filter((t) => t.paperType === "previous_year");

  const displayName = series?.name ?? name ?? "Test Series";
  const rawImage = series?.image ?? image;
  const logoUrl = rawImage ? mediaService.resolveMediaUrl(rawImage) : undefined;
  const displayDescription = series?.description ?? description;
  const notificationPdfUrl = series?.notificationPdf
    ? mediaService.resolveMediaUrl(series.notificationPdf)
    : undefined;
  const importantDates = IMPORTANT_DATES_CONFIG.map((c) => {
    const v = series?.importantDates?.[c.key];
    let date = "—";
    if (v?.from) {
      date = v.to && v.to !== v.from
        ? `${formatImportantDate(v.from)} - ${formatImportantDate(v.to)}`
        : formatImportantDate(v.from);
    }
    return { ...c, date };
  });

  const startTest = (testId: string) => navigate({ to: "/test/$testId/instructions", params: { testId } });

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
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-11 w-11 rounded-full object-cover shrink-0" />
            ) : (
              <ExamIcon name={displayName} className="h-11 w-11 text-sm shrink-0" />
            )}
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
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0 flex-1">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="h-14 w-14 rounded-full object-cover shrink-0 ring-2 ring-border" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-red-700 to-red-900 ring-2 ring-amber-400 grid place-items-center shrink-0">
                    <Landmark className="h-7 w-7 text-amber-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl md:text-2xl font-display font-extrabold">{displayName}</h1>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-transparent">
                      Graduate Level
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {displayDescription ??
                      "Staff Selection Commission Combined Graduate Level Examination is conducted to recruit candidates for various Group B and Group C posts."}
                  </p>
                </div>
              </div>
              <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                <Button className="flex-1 sm:flex-none" asChild>
                  <a href={series?.applyLink ?? "#"} target="_blank" rel="noopener noreferrer">
                    Apply Online <ExternalLink className="h-4 w-4 ml-1.5" />
                  </a>
                </Button>
                <Button variant="outline" className="flex-1 sm:flex-none" asChild>
                  <a href={notificationPdfUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-1.5" /> Download Notification
                  </a>
                </Button>
              </div>
            </div>
          </Card>

          {activeSection === "overview" && <Card className="p-5 lg:p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg">Important Dates</h2>
            </div>
            <div className="relative">
              <div className="absolute top-6 left-0 right-0 h-px bg-border" />
              <div className="relative grid grid-cols-3 sm:grid-cols-6 gap-y-4">
                {importantDates.map((d) => (
                  <div key={d.label} className="text-center px-1">
                    <div className={cn("h-12 w-12 rounded-full grid place-items-center mx-auto", d.tint)}>
                      <d.icon className="h-5 w-5" />
                    </div>
                    <div className="text-xs font-semibold mt-2.5 truncate">{d.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{d.date}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>}

          {activeSection === "overview" && (
            <Card className="p-5 lg:p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-display font-extrabold">Exam Details</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get complete information about eligibility, exam pattern and syllabus.
                  </p>
                </div>
                {/* Same dummy info sheet for every exam until real per-series documents exist */}
                <Button size="lg" className="h-auto py-2.5 px-5" asChild>
                  <a href="/docs/ssc-exam-info.pdf" download={`${displayName}-info.pdf`}>
                    <Download className="h-5 w-5 mr-2 shrink-0" />
                    <span className="text-left leading-tight">
                      <span className="block text-sm font-semibold">Download All Details</span>
                      <span className="block text-[11px] font-normal opacity-90">PDF (Complete Guide)</span>
                    </span>
                  </a>
                </Button>
              </div>

              <div className="space-y-3">
                {EXAM_DETAIL_SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    className="w-full flex items-center gap-4 rounded-xl border border-border p-4 text-left hover:border-primary/40 hover:shadow-sm transition"
                  >
                    <span className={cn("h-12 w-12 rounded-xl grid place-items-center shrink-0", s.tint)}>
                      <s.icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-base">{s.title}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{s.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {activeSection === "mocks" && (
            <Card className="p-5 lg:p-6">
              <h2 className="font-display font-bold text-lg mb-4">Full Length Mock Tests</h2>
              {testsLoading ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
              ) : mockTests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No mock tests available yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {mockTests.map((t) => (
                    <div key={t._id} className="rounded-xl border border-border p-4 flex flex-col gap-3 hover:shadow-md transition-shadow bg-card">
                      <div className="flex items-start gap-3">
                        {logoUrl ? (
                          <img src={logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-blue-50 grid place-items-center shrink-0">
                            <ClipboardList className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <Badge variant="outline" className="text-[10px] mb-1.5 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-50">
                            {t.isPaid ? "PAID" : "FREE"}
                          </Badge>
                          <div className="font-bold text-sm leading-snug">{t.title}</div>
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
                      <Button className="w-full" onClick={() => startTest(t._id)}>
                        Start Test →
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {activeSection === "pyp" && (
            <Card className="p-5 lg:p-6">
              <h2 className="font-display font-bold text-lg mb-4">Previous Year Question Papers</h2>
              {testsLoading ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
              ) : pypTests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No papers available yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {pypTests.map((t) => (
                    <div key={t._id} className="rounded-xl border border-border p-4 flex flex-col gap-3 hover:shadow-md transition-shadow bg-card">
                      <div className="flex items-start gap-3">
                        {logoUrl ? (
                          <img src={logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-blue-50 grid place-items-center shrink-0">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <Badge variant="outline" className="text-[10px] mb-1.5 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-50">
                            {t.isPaid ? "PAID" : "FREE"}
                          </Badge>
                          <div className="font-bold text-sm leading-snug">{t.title}</div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span>{t.totalQuestions} Questions &nbsp;·&nbsp; {t.totalMarks} Marks</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>{t.duration} Mins</span>
                        </div>
                      </div>
                      <Button className="w-full" onClick={() => startTest(t._id)}>
                        Start Now →
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right panel */}
        <aside className="space-y-4">
          <Card className="p-4">
            <h3 className="font-display font-bold text-sm mb-3">Quick Links</h3>
            <ul className="space-y-1">
              {QUICK_LINKS_CONFIG.map(({ label, icon: Icon, key }) => {
                // notificationPdfUrl is already resolved; officialWebsite/applyLink are external URLs
                const href = key === "notificationPdf"
                  ? (notificationPdfUrl ?? "#")
                  : (series?.[key] ?? "#");
                return (
                  <li key={label}>
                    <a
                      href={href}
                      target={href !== "#" ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-primary" />
                        {label}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-4">
            <h3 className="font-display font-bold text-sm mb-3">Recommended Mock Tests</h3>
            {testsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}
              </div>
            ) : mockTests.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tests yet.</p>
            ) : (
              <ul className="space-y-3">
                {mockTests.slice(0, 3).map((t) => (
                  <li key={t._id} className="flex items-center justify-between gap-2 border-b border-border last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {logoUrl ? (
                        <img src={logoUrl} alt="" className="h-8 w-8 rounded-md object-cover shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-md bg-blue-50 grid place-items-center shrink-0">
                          <ClipboardList className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{t.title}</div>
                        <div className="text-xs text-muted-foreground">{t.totalQuestions} Questions</div>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => startTest(t._id)}>
                      Start Test
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setActiveSection("mocks")}>
              View All Mock Tests
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
