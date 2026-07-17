import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Home, CalendarDays, Users, BookOpen, ClipboardList, ListChecks,
  FileText, BarChart3, FileBadge, Library, Lightbulb, HelpCircle,
  ExternalLink, Download, ChevronRight, Trophy, Globe, Edit3,
  Bell, IdCard, Award, KeyRound, CheckCircle2, FileSignature,
  ScrollText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { ExamIcon } from "@/components/site/ExamIcon";
import { cn } from "@/lib/utils";

// No backend endpoint exists yet for exam detail pages — this page stays on
// static placeholder content until that resource is added to the API.
const EXAMS: Record<string, any> = {
  "ssc-cgl": { id: "ex1", slug: "ssc-cgl", name: "SSC CGL", short_name: "SSC CGL", conducting_body: "Staff Selection Commission", level: "Graduate", description: "Combined Graduate Level exam for Group B & C posts.", apply_url: "#", notification_url: "#" },
  "ssc-chsl": { id: "ex2", slug: "ssc-chsl", name: "SSC CHSL", short_name: "SSC CHSL", conducting_body: "Staff Selection Commission", level: "12th Pass", description: "Combined Higher Secondary Level exam.", apply_url: "#", notification_url: "#" },
  "ibps-po": { id: "ex3", slug: "ibps-po", name: "IBPS PO", short_name: "IBPS PO", conducting_body: "IBPS", level: "Graduate", description: "Probationary Officer recruitment for public sector banks.", apply_url: "#", notification_url: "#" },
  "rrb-ntpc": { id: "ex4", slug: "rrb-ntpc", name: "RRB NTPC", short_name: "RRB NTPC", conducting_body: "Railway Recruitment Board", level: "Graduate", description: "Non-Technical Popular Categories recruitment.", apply_url: "#", notification_url: "#" },
};

export const Route = createFileRoute("/exams/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.toUpperCase()} — Exam Details, Syllabus, Mock Tests | GovtPrep` },
      { name: "description", content: `Complete details, syllabus, exam pattern, eligibility, and mock tests for ${params.slug.toUpperCase()}.` },
    ],
  }),
  component: ExamDetail,
  errorComponent: ({ error }) => (
    <SiteShell><div className="container mx-auto p-8 text-sm text-destructive">{error.message}</div></SiteShell>
  ),
  notFoundComponent: () => (
    <SiteShell><div className="container mx-auto p-8">Exam not found.</div></SiteShell>
  ),
});

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "dates", label: "Important Dates", icon: CalendarDays },
  { id: "eligibility", label: "Eligibility", icon: Users },
  { id: "syllabus", label: "Syllabus", icon: BookOpen },
  { id: "pattern", label: "Exam Pattern", icon: ClipboardList },
  { id: "selection", label: "Selection Process", icon: ListChecks },
  { id: "pyp", label: "Previous Year Papers", icon: FileText },
  { id: "cutoff", label: "Cut Off", icon: BarChart3 },
  { id: "mocks", label: "Mock Tests", icon: FileBadge },
  { id: "books", label: "Books & Study Material", icon: Library },
  { id: "tips", label: "Preparation Tips", icon: Lightbulb },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

function ExamDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");

  const exam = EXAMS[slug];
  const tests: any[] = [];

  if (!exam) throw notFound();

  const startTest = () => {
    // Exam-to-test mapping doesn't exist on the backend yet — send the user
    // to the real mock tests list instead of a fabricated test id.
    navigate({ to: "/dashboard/mock-tests" });
  };

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const eligibility = (exam.eligibility ?? {}) as Record<string, string>;
  const syllabus = (exam.syllabus ?? []) as { subject: string; topics: string[] }[];
  const pattern = (exam.exam_pattern ?? []) as { subject: string; questions: number; marks: number }[];
  const dates = (exam.important_dates ?? []) as { label: string; date: string }[];
  const selection = (exam.selection_process ?? []) as string[];
  const tips = (exam.preparation_tips ?? []) as string[];
  const faqs = (exam.faqs ?? []) as { q: string; a: string }[];

  const totalQuestions = pattern.reduce((s, p) => s + (p.questions ?? 0), 0);
  const totalMarks = pattern.reduce((s, p) => s + (p.marks ?? 0), 0);
  const duration = tests[0]?.duration_minutes ?? 60;

  const DATE_ICONS = [CheckCircle2, FileSignature, CalendarDays, IdCard, ScrollText, Trophy];
  const DATE_TINTS = [
    "bg-emerald-50 text-emerald-600",
    "bg-blue-50 text-blue-600",
    "bg-amber-50 text-amber-600",
    "bg-violet-50 text-violet-600",
    "bg-rose-50 text-rose-600",
    "bg-slate-50 text-slate-600",
  ];

  const QUICK_LINKS = [
    { label: "Official Website", icon: Globe, href: (exam as any).official_url ?? exam.apply_url ?? "#", external: true },
    { label: "Apply Online", icon: Edit3, href: exam.apply_url ?? "#", external: true },
    { label: "Download Syllabus", icon: Download, href: "#", external: false },
    { label: "Latest Notification", icon: Bell, href: exam.notification_url ?? "#", external: true },
    { label: "Admit Card", icon: IdCard, href: "#", external: false },
    { label: "Result", icon: Trophy, href: "#", external: false },
    { label: "Answer Key", icon: KeyRound, href: "/dashboard/answer-key", external: false },
  ];

  const LATEST_UPDATES = [
    { title: `${exam.short_name ?? exam.name} 2025 Notification Released`, date: dates[0]?.date ?? "09 May 2025" },
    { title: "Application Process Started", date: dates[1]?.date ?? "09 May 2025" },
    { title: "Tier 1 Exam Date Announced", date: dates[4]?.date ?? "24 Apr 2025" },
  ];

  return (
    <SiteShell>
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="container mx-auto px-4 lg:px-6 pt-5 pb-16"
      >
        <Breadcrumbs
          items={[
            { label: "Home", to: "/" },
            { label: "Exams", to: "/exams" },
            { label: `${(exam.conducting_body?.split(" ")[0] ?? "")} Exams`, to: "/exams" },
            { label: exam.short_name ?? exam.name },
          ]}
        />

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_300px] gap-5">
          {/* LEFT SIDEBAR */}
          <aside className="space-y-5">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <ExamIcon name={exam.short_name ?? exam.name} className="h-12 w-12 text-sm shrink-0" />
                <div className="min-w-0">
                  <div className="font-display font-extrabold text-base truncate">{exam.short_name ?? exam.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{exam.conducting_body}</div>
                </div>
              </div>
              <nav className="mt-5 -mx-1 space-y-0.5">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollTo(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors text-left",
                        active
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground/80 hover:bg-muted"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </Card>

            <Card className="p-5 bg-primary/5 border-primary/20">
              <div className="h-10 w-10 rounded-xl bg-primary/15 grid place-items-center mb-3">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div className="font-display font-bold text-sm">Start your preparation</div>
              <p className="text-xs text-muted-foreground mt-1">
                Take a free mock test to evaluate your preparation level.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-4 w-full bg-background">
                <Link to="/dashboard/mock-tests">Start Free Mock Test</Link>
              </Button>
            </Card>
          </aside>

          {/* CENTER */}
          <div className="space-y-5 min-w-0">
            {/* Header card */}
            <Card id="overview" className="p-5 lg:p-6">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 items-start">
                <div className="flex items-start gap-4 min-w-0">
                  <ExamIcon name={exam.short_name ?? exam.name} className="h-14 w-14 text-base shrink-0" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl md:text-3xl font-display font-extrabold">{exam.short_name ?? exam.name}</h1>
                      {exam.level && (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-transparent">
                          {exam.level} Level
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{exam.description}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[200px]">
                  <Button asChild>
                    <a href={exam.apply_url ?? "#"} target="_blank" rel="noreferrer">
                      Apply Online <ExternalLink className="ml-1.5 h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={exam.notification_url ?? "#"} target="_blank" rel="noreferrer">
                      <Download className="mr-1.5 h-4 w-4" /> Download Notification
                    </a>
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Conducting Body", value: exam.conducting_body, icon: Award },
                  { label: "Exam Level", value: `${exam.level ?? "—"} Level`, icon: GraduationCapIcon },
                  { label: "Posts", value: (exam as any).posts ?? "Various Group B & C Posts", icon: Users },
                ].map((info) => (
                  <div key={info.label} className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                      <info.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{info.label}</div>
                      <div className="text-sm font-semibold truncate">{info.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Important Dates */}
            <Card id="dates" className="p-5 lg:p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-lg">Important Dates</h2>
                <button className="text-sm text-primary font-semibold inline-flex items-center gap-1 hover:underline">
                  View All Dates <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {(dates.length ? dates : Array.from({ length: 6 }, (_, i) => ({ label: ["Notification","Application Start","Last Date to Apply","Admit Card","Tier 1 Exam","Tier 1 Result"][i], date: "—" }))).slice(0, 6).map((d, i) => {
                  const Icon = DATE_ICONS[i % DATE_ICONS.length];
                  return (
                    <motion.div
                      key={d.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="text-center"
                    >
                      <div className={cn("h-12 w-12 rounded-full grid place-items-center mx-auto", DATE_TINTS[i % DATE_TINTS.length])}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-sm font-semibold mt-3">{d.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{d.date}</div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Eligibility */}
              <Card id="eligibility" className="p-5 lg:p-6">
                <h2 className="font-display font-bold text-lg mb-4">Eligibility</h2>
                <div className="space-y-4">
                  {(Object.keys(eligibility).length ? Object.entries(eligibility) : [
                    ["Nationality", "Candidate must be a citizen of India."],
                    ["Age Limit", "18 to 32 years as on 01.08.2025"],
                    ["Qualification", "Bachelor's Degree from a recognized University."],
                    ["Age Relaxation", "As per government norms."],
                  ]).map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold capitalize">{k.replace(/_/g, " ")}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{v}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 text-right">
                  <button className="text-sm text-primary font-semibold hover:underline">View Details</button>
                </div>
              </Card>

              {/* Exam Pattern */}
              <Card id="pattern" className="p-5 lg:p-6">
                <h2 className="font-display font-bold text-lg mb-4">Exam Pattern (Tier 1)</h2>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Subject</TableHead>
                        <TableHead className="text-xs text-right">Questions</TableHead>
                        <TableHead className="text-xs text-right">Marks</TableHead>
                        <TableHead className="text-xs text-right">Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(pattern.length ? pattern : [
                        { subject: "General Intelligence & Reasoning", questions: 25, marks: 50 },
                        { subject: "General Awareness", questions: 25, marks: 50 },
                        { subject: "Quantitative Aptitude", questions: 25, marks: 50 },
                        { subject: "English Comprehension", questions: 25, marks: 50 },
                      ]).map((p, i, arr) => (
                        <TableRow key={p.subject}>
                          <TableCell className="text-sm">{p.subject}</TableCell>
                          <TableCell className="text-sm text-right">{p.questions}</TableCell>
                          <TableCell className="text-sm text-right">{p.marks}</TableCell>
                          {i === 0 && (
                            <TableCell rowSpan={arr.length + 1} className="text-sm text-right align-middle text-muted-foreground">
                              {duration}<br />Minutes
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30">
                        <TableCell className="text-sm font-bold">Total</TableCell>
                        <TableCell className="text-sm text-right font-bold">{totalQuestions || 100}</TableCell>
                        <TableCell className="text-sm text-right font-bold">{totalMarks || 200}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 text-right">
                  <button className="text-sm text-primary font-semibold inline-flex items-center gap-1 hover:underline">
                    View Full Pattern <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            </div>

            {/* Syllabus */}
            <Card id="syllabus" className="p-5 lg:p-6">
              <h2 className="font-display font-bold text-lg mb-4">Syllabus</h2>
              <Tabs defaultValue={(syllabus[0]?.subject) ?? "General Intelligence & Reasoning"}>
                <TabsList className="bg-transparent p-0 h-auto flex flex-wrap gap-2 mb-5 justify-start">
                  {(syllabus.length ? syllabus : [
                    { subject: "General Intelligence & Reasoning", topics: ["Analogy", "Similarities & Differences", "Space Visualization", "Problem Solving", "Analysis", "Judgment", "Decision Making", "Visual Memory", "Discrimination", "Observation", "Relationship Concepts", "Arithmetical Reasoning", "Figural Classification", "Arithmetic Number Series", "Non-Verbal Series", "Coding & Decoding", "Statement - Conclusion"] },
                    { subject: "General Awareness", topics: ["Current Affairs", "History", "Geography", "Polity", "Economy", "Science"] },
                    { subject: "Quantitative Aptitude", topics: ["Number Systems", "Percentages", "Ratio & Proportion", "Time & Work", "Algebra", "Geometry", "Trigonometry"] },
                    { subject: "English Comprehension", topics: ["Reading Comprehension", "Grammar", "Vocabulary", "Sentence Correction", "Fill in the Blanks"] },
                  ]).map((s) => (
                    <TabsTrigger
                      key={s.subject}
                      value={s.subject}
                      className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
                    >
                      {s.subject}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {(syllabus.length ? syllabus : [
                  { subject: "General Intelligence & Reasoning", topics: ["Analogy", "Similarities & Differences", "Space Visualization", "Problem Solving", "Analysis", "Judgment", "Decision Making", "Visual Memory", "Discrimination", "Observation", "Relationship Concepts", "Arithmetical Reasoning", "Figural Classification", "Arithmetic Number Series", "Non-Verbal Series", "Coding & Decoding", "Statement - Conclusion"] },
                  { subject: "General Awareness", topics: ["Current Affairs", "History", "Geography", "Polity", "Economy", "Science"] },
                  { subject: "Quantitative Aptitude", topics: ["Number Systems", "Percentages", "Ratio & Proportion", "Time & Work", "Algebra", "Geometry", "Trigonometry"] },
                  { subject: "English Comprehension", topics: ["Reading Comprehension", "Grammar", "Vocabulary", "Sentence Correction", "Fill in the Blanks"] },
                ]).map((s) => (
                  <TabsContent key={s.subject} value={s.subject} className="m-0">
                    <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5">
                      <li>{s.topics.join(", ")}, etc.</li>
                    </ul>
                  </TabsContent>
                ))}
              </Tabs>
              <div className="mt-4 text-right">
                <button className="text-sm text-primary font-semibold inline-flex items-center gap-1 hover:underline">
                  View Full Syllabus <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </Card>

            {/* Selection Process */}
            {selection.length > 0 && (
              <Card id="selection" className="p-5 lg:p-6">
                <h2 className="font-display font-bold text-lg mb-4">Selection Process</h2>
                <ol className="space-y-2 text-sm">
                  {selection.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs grid place-items-center font-bold shrink-0">{i + 1}</span>
                      <span className="pt-0.5">{s}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {/* PYP / Cutoff / Books quick links */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: "pyp", icon: FileText, label: "Previous Year Papers", to: "/dashboard/previous-year-papers" },
                { id: "cutoff", icon: BarChart3, label: "Cut Off Analysis", to: "/dashboard/attempted-tests" },
                { id: "mocks", icon: FileBadge, label: "Mock Tests", to: "/dashboard/mock-tests" },
                { id: "books", icon: Library, label: "Books & Study Material", to: "/exams" },
              ].map((item) => (
                <Link key={item.id} to={item.to} id={item.id}>
                  <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all h-full">
                    <span className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center mb-2">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <div className="text-sm font-semibold">{item.label}</div>
                  </Card>
                </Link>
              ))}
            </div>

            {tips.length > 0 && (
              <Card id="tips" className="p-5 lg:p-6">
                <h2 className="font-display font-bold text-lg mb-3">Preparation Tips</h2>
                <ul className="space-y-2 text-sm">
                  {tips.map((t, i) => (
                    <li key={i} className="flex gap-2"><Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />{t}</li>
                  ))}
                </ul>
              </Card>
            )}

            {faqs.length > 0 && (
              <Card id="faq" className="p-5 lg:p-6">
                <h2 className="font-display font-bold text-lg mb-3">FAQ</h2>
                <div className="space-y-3">
                  {faqs.map((f, i) => (
                    <div key={i}>
                      <div className="font-semibold text-sm">{f.q}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{f.a}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="space-y-5">
            <Card className="p-5">
              <h3 className="font-display font-bold text-base mb-3">Quick Links</h3>
              <ul className="space-y-1">
                {QUICK_LINKS.map(({ label, icon: Icon, href, external }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noreferrer" : undefined}
                      className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted transition-colors"
                    >
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

            <Card className="p-5">
              <h3 className="font-display font-bold text-base mb-3">Latest Updates</h3>
              <ul className="space-y-3">
                {LATEST_UPDATES.map((u, i) => (
                  <li key={i} className="border-b border-border last:border-0 pb-3 last:pb-0">
                    <div className="text-sm font-semibold leading-snug">{u.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{u.date}</div>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="w-full mt-4">View All Updates</Button>
            </Card>

            <Card className="p-5">
              <h3 className="font-display font-bold text-base mb-3">Recommended Mock Tests</h3>
              <ul className="space-y-3">
                {(tests.length ? tests.slice(0, 3) : [
                  { id: "rec-1", title: `${exam.short_name ?? exam.name} Tier 1 Full Mock Test`, total_questions: 100 },
                  { id: "rec-2", title: `${exam.short_name ?? exam.name} Previous Year Test`, total_questions: 100 },
                  { id: "rec-3", title: `${exam.short_name ?? exam.name} Quantitative Aptitude`, total_questions: 25 },
                ]).map((t: any) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 border-b border-border last:border-0 pb-3 last:pb-0">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.total_questions} Questions</div>
                    </div>
                    <Button size="sm" onClick={startTest}>
                      Start Test
                    </Button>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                <Link to="/dashboard/mock-tests">View All Mock Tests</Link>
              </Button>
            </Card>
          </aside>
        </div>
      </motion.div>
    </SiteShell>
  );
}

// Small inline icon to avoid a duplicate import name
function GraduationCapIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}
