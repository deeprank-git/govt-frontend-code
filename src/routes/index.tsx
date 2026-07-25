import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import * as currentAffairsService from "@/services/currentAffairsService";
import { unwrapList } from "@/lib/api-unwrap";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowRight,
  Users,
  ClipboardList,
  FileText,
  GraduationCap,
  Shield,
  Sparkles,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SiteShell } from "@/components/site/SiteShell";
import { ExamIcon } from "@/components/site/ExamIcon";
import heroImg from "@/assets/hero-student.png";

// No backend endpoint exists yet for exams/categories/current-affairs browsing
// (see AGENTS.md) — the homepage stays on static placeholder content until
// those resources are added to the API.
const CATEGORIES = [
  { id: "cat1", slug: "ssc", name: "SSC" },
  { id: "cat2", slug: "banking", name: "Banking" },
];
const EXAMS = [
  { id: "ex1", slug: "ssc-cgl", name: "SSC CGL", short_name: "SSC CGL", category_id: "cat1" },
  { id: "ex2", slug: "ssc-chsl", name: "SSC CHSL", short_name: "SSC CHSL", category_id: "cat1" },
  { id: "ex3", slug: "ibps-po", name: "IBPS PO", short_name: "IBPS PO", category_id: "cat2" },
];
const FREE_TESTS = [
  { id: "t1", title: "SSC CGL Tier 1 Full Mock Test 01", total_questions: 100, duration_minutes: 60, attempt_count: 45210 },
  { id: "t2", title: "IBPS PO Prelims Mock Test 01", total_questions: 100, duration_minutes: 60, attempt_count: 32110 },
];
const ALERTS = [
  { id: "a1", title: "SSC CGL Tier 2 Admit Card Released", alert_date: new Date(Date.now() + 3 * 86400000).toISOString(), alert_type: "admit_card" },
];

export const Route = createFileRoute("/")({
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

const STATS = [
  { value: "10L+", label: "Aspirants", icon: Users },
  { value: "50K+", label: "Mock Tests", icon: ClipboardList },
  { value: "15K+", label: "PYQ Papers", icon: FileText },
  { value: "150+", label: "Exams Covered", icon: GraduationCap },
  { value: "100%", label: "Free Access", icon: Sparkles },
  { value: "Safe & Secure", label: "No Hidden Charges", icon: Shield },
];

function HomePage() {
  const { user } = useAuth();
  const categories = CATEGORIES;
  const exams = EXAMS;
  const freeTests = FREE_TESTS;
  const alerts = ALERTS;

  const { data: caRes } = useQuery({
    queryKey: ["home-current-affairs"],
    queryFn: () => currentAffairsService.getCurrentAffairs({ limit: 2 }),
    enabled: !!user,
  });
  const currentAffairs = unwrapList<any>(caRes);

  return (
    <SiteShell>
      {/* HERO */}
      <section className="bg-hero-radial">
        <div className="container mx-auto px-4 lg:px-6 pt-12 pb-20 grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
          <div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight text-foreground">
              Your Journey to a <br />
              <span className="text-primary">Government Job</span> <br />
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
            <div className="absolute inset-x-6 top-8 bottom-8 rounded-[2rem] bg-primary/10 -z-10" />
            <img
              src={heroImg}
              alt="Student preparing for government exams"
              width={1024}
              height={896}
              className="relative w-full max-w-[560px] mx-auto"
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
          <h2 className="text-2xl md:text-3xl font-display font-bold">Popular Exams</h2>
          <Link to="/exams" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            View All Exams <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <Tabs defaultValue={categories[0]?.slug ?? "ssc"} className="w-full">
          <TabsList className="bg-transparent p-0 h-auto flex flex-wrap gap-2 mb-6 justify-start">
            {categories.map((c) => (
              <TabsTrigger
                key={c.slug}
                value={c.slug}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
              >
                {c.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {categories.map((c) => {
            const list = exams.filter((e) => e.category_id === c.id).slice(0, 8);
            return (
              <TabsContent key={c.slug} value={c.slug} className="m-0">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.length === 0 && (
                    <Card className="p-6 col-span-full text-sm text-muted-foreground">
                      No exams in this category yet.
                    </Card>
                  )}
                  {list.map((e) => (
                    <Link
                      key={e.id}
                      to="/exams/$slug"
                      params={{ slug: e.slug }}
                      className="group"
                    >
                      <Card className="p-3.5 flex items-center gap-3 hover:border-primary hover:shadow-elevate transition">
                        <ExamIcon name={e.short_name ?? e.name} />
                        <span className="font-medium flex-1">{e.short_name ?? e.name}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </Card>
                    </Link>
                  ))}
                  <Link
                    to="/exams"
                    className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3.5 flex items-center justify-center gap-2 text-primary font-medium hover:bg-primary/10 transition"
                  >
                    Explore all exams <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </section>

      {/* FREE MOCK + CURRENT AFFAIRS + UPCOMING */}
      <section className="container mx-auto px-4 lg:px-6 pb-16 grid lg:grid-cols-3 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">Top Free Mock Tests</h3>
            <Link to="/exams" className="text-xs text-primary hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {freeTests.map((t) => (
              <div key={t.id} className="rounded-lg border border-border p-3">
                <Badge variant="secondary" className="mb-2 bg-success/15 text-success-foreground">FREE</Badge>
                <div className="font-semibold text-sm leading-snug">{t.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t.total_questions} Questions · {t.duration_minutes} Mins
                </div>
                <div className="text-xs text-muted-foreground">{(t.attempt_count ?? 0).toLocaleString()} Attempts</div>
                <Button size="sm" className="mt-3 w-full" asChild>
                  <Link to="/dashboard/mock-tests">Start Test</Link>
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">Latest Current Affairs</h3>
            <Link to="/current-affairs" className="text-xs text-primary hover:underline">View All</Link>
          </div>
          {!user ? (
            <p className="text-sm text-muted-foreground">
              <Link to="/auth" search={{ mode: "login" } as never} className="text-primary hover:underline">Log in</Link> to see today's current affairs.
            </p>
          ) : (
            <div className="space-y-3">
              {currentAffairs.map((a) => (
                <Link key={a._id} to="/current-affairs/$id" params={{ id: a._id }} className="block rounded-lg border border-border p-3 hover:border-primary transition">
                  <Badge className="mb-2 bg-primary/15 text-primary border-transparent">{a.category}</Badge>
                  <div className="font-semibold text-sm leading-snug">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(a.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">Upcoming Exam Calendar</h3>
            <Link to="/exam-info" className="text-xs text-primary hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {alerts.map((a) => (
              <div key={a.id} className="rounded-lg border border-border p-3 flex items-start gap-3">
                <span className="h-9 w-9 grid place-items-center rounded-md bg-primary/10 text-primary shrink-0">
                  <Calendar className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm leading-snug truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {a.alert_date ? new Date(a.alert_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Soon"}
                  </div>
                </div>
                <Badge variant="outline" className="bg-warning/15 border-warning/40 text-warning-foreground">
                  {a.alert_type?.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </SiteShell>
  );
}
