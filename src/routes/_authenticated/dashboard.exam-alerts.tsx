import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Target,
  RotateCcw,
  Calendar,
  Edit3,
  IdCard,
  Megaphone,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Settings,
  Moon,
  Send,
  Tag,
  Lightbulb,
  MoreVertical,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/exam-alerts")({
  component: AlertsPage,
});

// No backend endpoint exists yet for exam alerts/notifications — this page
// stays on static placeholder content until that resource is added to the API.
const CATEGORIES_MIN = [
  { id: "c1", name: "SSC" },
  { id: "c2", name: "Banking" },
];
const ALERTS_ALL = [
  { id: "a1", title: "SSC CGL Tier 2 Admit Card Released", description: "Download your admit card now", alert_type: "admit_card", alert_date: new Date(Date.now() + 3 * 86400000).toISOString(), category_id: "c1" },
  { id: "a2", title: "IBPS PO Registration Open", description: "Apply before the last date", alert_type: "registration", alert_date: new Date(Date.now() + 10 * 86400000).toISOString(), category_id: "c2" },
  { id: "a3", title: "SSC CHSL Tier 1 Result Declared", description: "Check your result", alert_type: "result", alert_date: new Date(Date.now() - 2 * 86400000).toISOString(), category_id: "c1" },
];

const TABS = [
  { id: "all", label: "All Alerts" },
  { id: "exam_date", label: "Upcoming Exams" },
  { id: "registration", label: "Registrations Open" },
  { id: "admit_card", label: "Admit Card" },
  { id: "result", label: "Results" },
  { id: "others", label: "Others" },
] as const;

const STATS = [
  { icon: CalendarDays, value: "28", label: "Upcoming Exams", tint: "bg-blue-50 text-blue-600" },
  { icon: Bell, value: "14", label: "New Notifications", tint: "bg-emerald-50 text-emerald-600" },
  { icon: CheckCircle2, value: "56", label: "Total Alerts", tint: "bg-violet-50 text-violet-600" },
  { icon: Target, value: "98%", label: "On-time Updates", tint: "bg-amber-50 text-amber-600" },
];

const ALERT_STYLES: Record<string, { icon: any; iconBg: string; badgeBg: string; badgeText: string; label: string }> = {
  exam_date: { icon: Calendar, iconBg: "bg-blue-50 text-blue-600", badgeBg: "bg-blue-100 hover:bg-blue-100", badgeText: "text-blue-700", label: "Exam Date" },
  registration: { icon: Edit3, iconBg: "bg-emerald-50 text-emerald-600", badgeBg: "bg-emerald-100 hover:bg-emerald-100", badgeText: "text-emerald-700", label: "Registration Open" },
  admit_card: { icon: IdCard, iconBg: "bg-violet-50 text-violet-600", badgeBg: "bg-violet-100 hover:bg-violet-100", badgeText: "text-violet-700", label: "Admit Card" },
  result: { icon: Megaphone, iconBg: "bg-orange-50 text-orange-600", badgeBg: "bg-orange-100 hover:bg-orange-100", badgeText: "text-orange-700", label: "Result" },
  others: { icon: AlertTriangle, iconBg: "bg-rose-50 text-rose-600", badgeBg: "bg-rose-100 hover:bg-rose-100", badgeText: "text-rose-700", label: "Notification" },
};

const PAGE_SIZE = 7;

function AlertsPage() {
  const [tab, setTab] = useState<string>("all");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");
  const [month, setMonth] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const alerts = ALERTS_ALL;
  const categories = CATEGORIES_MIN;

  const filtered = useMemo(() => {
    let rows = [...alerts];
    if (tab !== "all") rows = rows.filter((r) => r.alert_type === tab);
    if (category !== "all") rows = rows.filter((r) => r.category_id === category);
    if (type !== "all") rows = rows.filter((r) => r.alert_type === type);
    if (month !== "all") rows = rows.filter((r) => r.alert_date?.slice(5, 7) === month);
    return rows;
  }, [alerts, tab, category, type, month, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const upcoming = useMemo(
    () => alerts.filter((a) => a.alert_date && new Date(a.alert_date) > new Date()).slice(0, 4),
    [alerts],
  );

  const remind = (id: string) => toast.success("We'll remind you about this alert");

  const reset = () => {
    setCategory("all"); setType("all"); setMonth("all"); setStatus("all"); setPage(1);
  };

  const daysUntil = (d: string | null) => {
    if (!d) return "—";
    const diff = Math.ceil((+new Date(d) - Date.now()) / 86400000);
    return diff <= 0 ? "Today" : `In ${diff} Days`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold flex items-center gap-2">
            Exam Alerts <Bell className="h-5 w-5 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Get instant notifications for exam dates, registrations, admit cards, results and important updates.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 xl:w-[640px]">
          {STATS.map((s, i) => (
            <motion.div key={s.label} whileHover={{ y: -2 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                <div className={`h-10 w-10 rounded-lg grid place-items-center ${s.tint}`}><s.icon className="h-5 w-5" /></div>
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
              <FilterField label="Notification Type">
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="exam_date">Exam Date</SelectItem>
                    <SelectItem value="registration">Registration</SelectItem>
                    <SelectItem value="admit_card">Admit Card</SelectItem>
                    <SelectItem value="result">Result</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Exam Month">
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger><SelectValue placeholder="All Months" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m) => (
                      <SelectItem key={m} value={m}>{new Date(2025, +m - 1).toLocaleString("en", { month: "long" })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Status">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="new">New Only</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
              <Button variant="outline" onClick={reset} className="text-primary border-primary/30">
                <RotateCcw className="h-4 w-4 mr-2" /> Reset Filters
              </Button>
            </div>
          </Card>

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

            <div className="divide-y divide-border">
              {pageRows.map((a) => {
                const style = ALERT_STYLES[a.alert_type] ?? ALERT_STYLES.others;
                const Icon = style.icon;
                const d = a.alert_date ? new Date(a.alert_date) : null;
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ backgroundColor: "hsl(var(--muted) / 0.4)" }}
                    className="px-4 py-4 flex items-center gap-4"
                  >
                    <div className={`h-11 w-11 rounded-lg grid place-items-center shrink-0 ${style.iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{a.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>
                    </div>
                    <Badge className={`${style.badgeBg} ${style.badgeText} border-0`}>{style.label}</Badge>
                    <div className="text-right text-xs">
                      <div className="font-medium">{d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</div>
                      <div className="text-muted-foreground">{d ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}</div>
                    </div>
                    <Button size="sm" variant="outline" className="text-primary border-primary/30 hover:bg-primary/5" onClick={() => remind(a.id)}>
                      <Bell className="h-3.5 w-3.5 mr-1.5" /> Remind Me
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                  </motion.div>
                );
              })}
              {pageRows.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">No alerts found.</div>}
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} alerts
              </span>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((n) => (
                  <Button key={n} size="icon" variant={n === page ? "default" : "ghost"} className="h-8 w-8 text-xs" onClick={() => setPage(n)}>{n}</Button>
                ))}
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-display font-bold text-sm">Upcoming Exams</span>
              <Link to="/exams" className="text-xs text-primary hover:underline">View All</Link>
            </div>
            <ul className="space-y-3">
              {upcoming.map((u) => {
                const d = u.alert_date ? new Date(u.alert_date) : null;
                return (
                  <li key={u.id} className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-lg bg-blue-50 grid place-items-center text-center">
                      <div className="leading-none">
                        <div className="text-[10px] font-bold text-blue-600 uppercase">{d ? d.toLocaleString("en", { month: "short" }) : ""}</div>
                        <div className="text-sm font-extrabold text-blue-700">{d ? d.getDate() : "—"}</div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs truncate">{u.title}</div>
                      <div className="text-[11px] text-muted-foreground">{d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border-0 hover:bg-blue-100 text-[10px]">{daysUntil(u.alert_date)}</Badge>
                  </li>
                );
              })}
              {upcoming.length === 0 && <li className="text-xs text-muted-foreground">No upcoming exams.</li>}
            </ul>
          </Card>

          <Card className="p-4">
            <div className="font-display font-bold text-sm mb-3">Alert Preferences</div>
            <ul className="space-y-1">
              {[
                { icon: Settings, label: "Notification Settings", sub: "Manage how you receive alerts" },
                { icon: Moon, label: "Quiet Hours", sub: "10:00 PM – 07:00 AM" },
                { icon: Send, label: "Delivery Channels", sub: "Push, Email, SMS" },
                { icon: Tag, label: "Exam Categories", sub: "12 categories selected" },
              ].map((p) => (
                <li key={p.label}>
                  <button className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left">
                    <p.icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold">{p.label}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{p.sub}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-display font-bold text-sm">Important Tip</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enable all notifications to stay ahead in your preparation and never miss an important update.
                </p>
              </div>
            </div>
            <Button variant="ghost" className="w-full mt-3 text-primary justify-between">
              Enable All Notifications <ChevronRight className="h-4 w-4" />
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
