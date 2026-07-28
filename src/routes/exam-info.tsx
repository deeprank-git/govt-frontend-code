import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Bell, FileText, ExternalLink, Download, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { ExamIcon } from "@/components/site/ExamIcon";

// No backend endpoint exists yet for exams/notifications browsing — this page
// stays on static placeholder content until those resources are added to the API.
const EXAMS = [
  { id: "ex1", slug: "ssc-cgl", name: "SSC CGL", short_name: "SSC CGL", conducting_body: "Staff Selection Commission" },
  { id: "ex2", slug: "ssc-chsl", name: "SSC CHSL", short_name: "SSC CHSL", conducting_body: "Staff Selection Commission" },
  { id: "ex3", slug: "ibps-po", name: "IBPS PO", short_name: "IBPS PO", conducting_body: "IBPS" },
];
const NOTIFICATIONS = [
  { id: "n1", title: "SSC CGL Tier 2 Admit Card Released", alert_date: new Date(Date.now() + 3 * 86400000).toISOString(), alert_type: "admit_card" },
  { id: "n2", title: "IBPS PO Registration Open", alert_date: new Date(Date.now() + 10 * 86400000).toISOString(), alert_type: "registration" },
];

export const Route = createFileRoute("/exam-info")({
  head: () => ({
    meta: [
      { title: "Exam Info — Notifications, Pattern, Syllabus | GovtPrep" },
      { name: "description", content: "All important info about government exams, notifications, syllabus, pattern and eligibility in one place." },
      { property: "og:title", content: "Exam Info — GovtPrep" },
      { property: "og:description", content: "Find the latest exam notifications, syllabus and pattern details." },
    ],
  }),
  component: ExamInfoPage,
});

function ExamInfoPage() {
  const exams = EXAMS;
  const notifications = NOTIFICATIONS;

  return (
    <SiteShell>
      <section className="bg-hero-radial">
        <div className="container mx-auto px-4 lg:px-6 pt-6 pb-12">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Exam Info" }]} />
          <div className="mt-6 grid lg:grid-cols-[1fr_300px] gap-8 items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-extrabold">Exam Info</h1>
              <p className="mt-2 text-muted-foreground max-w-xl">
                All the important information about government exams, notifications, syllabus, pattern, eligibility and more at one place.
              </p>
              <form className="mt-5 max-w-lg flex gap-2">
                <Input placeholder="Search for exams (e.g. SSC CGL, IBPS PO…)" className="bg-background" />
                <Button>Search</Button>
              </form>
            </div>
            <div className="hidden lg:flex justify-center text-6xl">📋</div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 lg:px-6 py-10 grid lg:grid-cols-[1fr_340px] gap-8">
        <div>
          <h2 className="font-display font-bold text-xl mb-4">Popular Exams</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {exams.map((e) => (
              <Card key={e.id} className="p-5 text-center hover:shadow-elevate transition">
                <ExamIcon name={e.short_name ?? e.name} className="mx-auto h-14 w-14 text-base mb-3" />
                <div className="font-display font-bold">{e.short_name ?? e.name}</div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2lh]">{e.conducting_body}</p>
                <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                  <Link to="/exams">View Details →</Link>
                </Button>
              </Card>
            ))}
          </div>

          <Card className="mt-8 p-5">
            <h3 className="font-display font-bold mb-4">Upcoming Exams</h3>
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div key={n.id} className="py-3 flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{n.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {n.alert_date ? new Date(n.alert_date).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-info/15 border-info/40">{n.alert_type?.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <h3 className="font-display font-bold mb-3 flex items-center gap-2"><Bell className="h-4 w-4 text-primary" />Latest Notifications</h3>
            <ul className="space-y-3">
              {notifications.slice(0, 5).map((n) => (
                <li key={n.id} className="text-sm">
                  <div className="font-medium leading-snug">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.alert_date ? new Date(n.alert_date).toLocaleDateString() : "Soon"}</div>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="font-display font-bold mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {["Exam Updates", "Admit Card", "Answer Key", "Results", "Cut Off", "Important Dates"].map((l) => (
                <li key={l} className="flex items-center justify-between hover:text-primary cursor-pointer">
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />{l}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </SiteShell>
  );
}
