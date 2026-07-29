import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import * as currentAffairsService from "@/services/currentAffairsService";
import * as categoryService from "@/services/categoryService";
import * as testSeriesService from "@/services/testSeriesService";
import * as testService from "@/services/testService";
import * as mediaService from "@/services/mediaService";
import { unwrapList } from "@/lib/api-unwrap";
import { useAuth } from "@/hooks/use-auth";
import { getToken, getUser } from "@/lib/auth-store";
import {
  ArrowRight,
  Users,
  ClipboardList,
  FileText,
  GraduationCap,
  Shield,
  Sparkles,
  ChevronRight,
  Newspaper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SiteShell } from "@/components/site/SiteShell";
import { ExamIcon } from "@/components/site/ExamIcon";
import { toast } from "sonner";
import heroImg from "@/assets/hero-student.png";

export const Route = createFileRoute("/")({
  // localStorage isn't available during SSR, so this check only runs
  // client-side — same reasoning as _authenticated/route.tsx's ssr:false.
  ssr: false,
  beforeLoad: () => {
    const token = getToken();
    const user = getUser();
    if (token && user) {
      throw redirect({ to: "/dashboard/overview" });
    }
  },
  head: () => ({
    meta: [
      { title: "GovtPrep — Your Journey to a Government Job Starts Here" },
      {
        name: "description",
        content:
          "Free mock tests, previous year papers, current affairs and exam alerts for SSC, Banking, Railways, UPSC and more.",
      },
      { property: "og:title", content: "GovtPrep — Prepare. Practice. Succeed." },
      {
        property: "og:description",
        content: "10L+ aspirants prepare with our free mock tests, PYQ papers and analytics.",
      },
    ],
  }),
  component: HomePage,
});

// These are marketing/trust-signal copy, not something the public API has a
// source for (there's no public "platform totals" endpoint) — left as
// static numbers rather than fabricating a fake API-backed figure.
const STATS = [
  { value: "10L+", label: "Aspirants", icon: Users },
  { value: "50K+", label: "Mock Tests", icon: ClipboardList },
  { value: "15K+", label: "PYQ Papers", icon: FileText },
  { value: "150+", label: "Exams Covered", icon: GraduationCap },
  { value: "100%", label: "Free Access", icon: Sparkles },
  { value: "Safe & Secure", label: "No Hidden Charges", icon: Shield },
];

// Category names are free text ("SSC", "Civil Services Exam", …) — append
// "Exams" only if the name doesn't already read like one.
function tabLabel(name: string) {
  const trimmed = (name ?? "").trim();
  return /exams?$/i.test(trimmed) ? trimmed : `${trimmed} Exams`;
}

// Total grid cells (3 cols x 4 rows). The last card-bearing slot is always
// reserved for the "Explore all exams" cell, so at most MAX_POPULAR_SERIES - 1
// real/dummy test-series cards are shown before it.
const MAX_POPULAR_SERIES = 12;

// TODO: DUMMY DATA for UI testing — remove once backend returns multiple SSC test series.
// Mirrors the shape returned by GET /api/test-series (id, name, category, image, description)
// so it can flow through the same card/link rendering as real data. Only merged into the
// SSC tab below — every other category renders real backend data exclusively.
// 11 items: combined with the 1 real "SSC CGL Tier 1 2026" series, this fills exactly the
// 11 card slots so "Explore all exams" naturally lands in the grid's 12th (last) cell.
const SSC_DUMMY_TEST_SERIES = [
  { _id: "dummy-ssc-1", name: "SSC CGL Tier 1 2026", category: "SSC", image: undefined, description: "Combined Graduate Level Tier 1 mock series." },
  { _id: "dummy-ssc-2", name: "SSC CHSL Tier 1 2026", category: "SSC", image: undefined, description: "Combined Higher Secondary Level Tier 1 mock series." },
  { _id: "dummy-ssc-3", name: "SSC MTS 2026", category: "SSC", image: undefined, description: "Multi Tasking Staff exam mock series." },
  { _id: "dummy-ssc-4", name: "SSC CPO Tier 1 2026", category: "SSC", image: undefined, description: "Central Police Organization Tier 1 mock series." },
  { _id: "dummy-ssc-5", name: "SSC Stenographer 2026", category: "SSC", image: undefined, description: "Stenographer Grade C & D mock series." },
  { _id: "dummy-ssc-6", name: "SSC JE 2026", category: "SSC", image: undefined, description: "Junior Engineer exam mock series." },
  { _id: "dummy-ssc-7", name: "SSC GD Constable 2026", category: "SSC", image: undefined, description: "General Duty Constable mock series." },
  { _id: "dummy-ssc-8", name: "SSC CGL Tier 2 2026", category: "SSC", image: undefined, description: "Combined Graduate Level Tier 2 mock series." },
  { _id: "dummy-ssc-9", name: "SSC Selection Post 2026", category: "SSC", image: undefined, description: "Selection Post Phase mock series." },
  { _id: "dummy-ssc-10", name: "SSC JHT 2026", category: "SSC", image: undefined, description: "Junior Hindi Translator mock series." },
  { _id: "dummy-ssc-11", name: "SSC Constable (Delhi Police) 2026", category: "SSC", image: undefined, description: "Delhi Police Constable mock series." },
];

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState<string | null>(null);

  // Both endpoints are public — no token sent, works for anonymous visitors.
  const { data: categoriesRes } = useQuery({
    queryKey: ["home-categories"],
    queryFn: () => categoryService.getCategories(),
  });
  const categories = unwrapList<any>(categoriesRes);

  const { data: seriesRes } = useQuery({
    queryKey: ["home-series"],
    queryFn: () => testSeriesService.getTestSeries(),
  });
  const series = unwrapList<any>(seriesRes);

  const resolvedCat = activeCat ?? categories[0]?._id ?? null;

  const { data: caRes } = useQuery({
    queryKey: ["home-current-affairs"],
    queryFn: () => currentAffairsService.getCurrentAffairs({ limit: 4 }),
  });
  const currentAffairs = unwrapList<any>(caRes);

  // GET /api/tests is public — the service/API has no isPaid query param, so
  // "free" is filtered client-side; sorted by attempts to surface the most
  // popular ones as "Top Free Mock Tests".
  const { data: freeTestsRes } = useQuery({
    queryKey: ["home-free-tests"],
    queryFn: () => testService.getTests({ paperType: "mock", isPublished: true }),
  });
  const freeTests = unwrapList<any>(freeTestsRes)
    .filter((t) => !t.isPaid)
    .sort((a, b) => (b.attemptsCount ?? 0) - (a.attemptsCount ?? 0))
    .slice(0, 3);

  // Checked from client-side auth state first — never calls
  // GET /api/tests/:id or POST /api/test-attempts/start before this.
  const startMockTest = (testId: string) => {
    if (!user) {
      toast.error("Login to access mock test");
      navigate({ to: "/auth", search: { mode: "login", redirect: `/test/${testId}/instructions` } as never });
      return;
    }
    navigate({ to: "/test/$testId/instructions", params: { testId } });
  };

  return (
    <SiteShell>
      {/* HERO */}
      <section className="bg-hero-radial">
        <div className="container mx-auto px-4 lg:px-6 pt-12 pb-20 grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
          <div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight text-foreground">
              Your Journey to a <br />
              <span className="text-gradient-primary">Government Job</span> <br />
              Starts Here
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-xl">
              Free mock tests, previous year papers, study material, current affairs and
              everything you need to crack government exams with confidence.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/dashboard/mock-tests">
                  Start Free Mock Test <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/exams">Explore Exams</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-6 top-8 bottom-8 rounded-4xl bg-primary/10 -z-10" />
            <img
              src={heroImg}
              alt="Student preparing for government exams"
              width={1024}
              height={896}
              className="relative w-full max-w-140 mx-auto"
            />
            <Card className="hidden md:flex absolute top-6 left-0 px-4 py-3 gap-3 items-center shadow-elevate">
              <div className="h-12 w-12 rounded-full bg-primary/10 grid place-items-center text-primary font-display font-bold">
                72%
              </div>
              <div className="text-xs leading-tight">
                <div className="font-semibold">Your Performance</div>
                <div className="text-muted-foreground">+6.2% this week</div>
              </div>
            </Card>
            <Card className="hidden md:block absolute bottom-4 right-0 px-4 py-3 shadow-elevate">
              <div className="text-xs text-muted-foreground">Recent Mock Test</div>
              <div className="text-sm font-semibold">SSC CGL Mock Test #12</div>
              <div className="text-xs text-muted-foreground mt-1">Score 146/200 · Rank 1256</div>
            </Card>
          </div>
        </div>

        {/* Stats strip */}
        <div className="container mx-auto px-4 lg:px-6 -mt-6 pb-10">
          <Card className="px-2 py-4 sm:p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-border">
              {STATS.map(({ value, label, icon: Icon }) => (
                <div key={label} className="px-4 py-3 flex items-center gap-3">
                  <span className="h-9 w-9 grid place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-base font-display font-bold leading-tight">{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* POPULAR EXAMS */}
      <section className="container mx-auto px-4 lg:px-6 py-14">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-display font-bold">All Exams</h2>
          <Link to="/exams" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            View All Exams <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {categories.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">No exam categories yet.</Card>
        ) : (
          <Tabs value={resolvedCat ?? undefined} onValueChange={setActiveCat} className="w-full">
            <TabsList className="bg-transparent p-0 h-auto flex flex-wrap gap-2 mb-6 justify-start">
              {categories.map((c) => (
                <TabsTrigger
                  key={c._id}
                  value={c._id}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
                >
                  {tabLabel(c.name)}
                </TabsTrigger>
              ))}
            </TabsList>
            {categories.map((c) => {
              const realList = series.filter((s) => (s.category?._id ?? s.category) === c._id);
              // TODO: DUMMY DATA for UI testing — remove this merge once the backend returns
              // multiple SSC test series; every other category is unaffected.
              const fullList = /ssc/i.test(c.name ?? "") ? [...realList, ...SSC_DUMMY_TEST_SERIES] : realList;
              // Reserve the last grid cell for "Explore all exams" — it always follows
              // immediately after the last card, whichever cell that happens to be.
              const list = fullList.slice(0, MAX_POPULAR_SERIES - 1);
              return (
                <TabsContent key={c._id} value={c._id} className="m-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-4 gap-4">
                    {list.length === 0 && (
                      <Card className="p-6 col-span-full text-sm text-muted-foreground">
                        No exams in this category yet.
                      </Card>
                    )}
                    {list.map((s) => {
                      const logoUrl = s.image ? mediaService.resolveMediaUrl(s.image) : undefined;
                      return (
                        <Link
                          key={s._id}
                          to="/exams/$id"
                          params={{ id: s._id }}
                          search={{
                            name: s.name,
                            category: c.name,
                            image: s.image || undefined,
                            description: s.description || undefined,
                          }}
                          className="group"
                        >
                          <Card className="p-3.5 flex items-center gap-3 hover:border-primary hover:shadow-elevate transition">
                            {logoUrl ? (
                              <img src={logoUrl} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                            ) : (
                              <ExamIcon name={s.name ?? "?"} />
                            )}
                            <span className="font-medium flex-1 truncate">{s.name}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          </Card>
                        </Link>
                      );
                    })}
                    <Link
                      to="/exams"
                      className="group"
                    >
                      <Card className="p-3.5 h-full flex items-center justify-center gap-2 border-dashed border-primary/40 bg-primary/5 text-primary font-medium hover:bg-primary/10 transition">
                        Explore all exams <ArrowRight className="h-4 w-4" />
                      </Card>
                    </Link>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </section>

      {/* FREE MOCK + CURRENT AFFAIRS */}
      <section className="container mx-auto px-4 lg:px-6 pb-16 grid lg:grid-cols-[2fr_1fr] gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">Top Free Mock Tests</h3>
            <Link to="/exams" className="text-xs text-primary hover:underline">View All</Link>
          </div>
          {freeTests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No free mock tests available yet.</p>
          ) : (
            <div className="grid sm:grid-cols-3 gap-3">
              {freeTests.map((t) => (
                <div key={t._id} className="rounded-lg border border-border p-3">
                  <Badge variant="secondary" className="mb-2 bg-success/15 text-success-foreground">FREE</Badge>
                  <div className="font-semibold text-sm leading-snug line-clamp-2">{t.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t.totalQuestions ?? 0} Questions · {t.duration ?? 0} Mins
                  </div>
                  <div className="text-xs text-muted-foreground">{(t.attemptsCount ?? 0).toLocaleString()} Attempts</div>
                  <Button size="sm" className="mt-3 w-full" onClick={() => startMockTest(t._id)}>
                    Start Test
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">Latest Current Affairs</h3>
            <Link to="/current-affairs" className="text-xs text-primary hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {currentAffairs.map((a) => (
              <Link
                key={a._id}
                to="/current-affairs/$id"
                params={{ id: a._id }}
                className="flex gap-3 rounded-lg border border-border p-2.5 hover:border-primary transition"
              >
                <div className="h-14 w-14 rounded-lg overflow-hidden shrink-0 bg-muted grid place-items-center">
                  {a.image ? (
                    <img src={mediaService.resolveMediaUrl(a.image)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Newspaper className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Badge className="mb-1 bg-primary/15 text-primary border-transparent text-[10px]">{a.category}</Badge>
                  <div className="font-semibold text-sm leading-snug line-clamp-2">{a.title}</div>
                  {a.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.summary}</p>}
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {new Date(a.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>
              </Link>
            ))}
            {currentAffairs.length === 0 && <p className="text-sm text-muted-foreground">No current affairs yet.</p>}
          </div>
        </Card>
      </section>
    </SiteShell>
  );
}
