import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Flame,
  ClipboardList,
  Trophy,
  Target,
  BarChart3,
  FileText,
  Bell,
  KeyRound,
  Newspaper,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as testAttemptService from "@/services/testAttemptService";
import { unwrapList } from "@/lib/api-unwrap";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Dashboard,
});

// No backend endpoint exists yet for PYQs, current affairs, answer keys or exam
// alerts — these widgets stay on static placeholder content until those
// resources are added to the API.
const PYQS = [
  { id: "p1", title: "SSC CGL Tier 1 2024", shift: "Shift 1", questions_count: 100, marks: 200, duration_minutes: 60 },
  { id: "p2", title: "IBPS PO Prelims 2024", shift: "Shift 2", questions_count: 100, marks: 100, duration_minutes: 60 },
];
const CURRENT_AFFAIRS = [
  { id: "c1", category: "Polity", title: "Parliament passes new labour codes", published_at: new Date().toISOString() },
  { id: "c2", category: "Economy", title: "RBI keeps repo rate unchanged", published_at: new Date().toISOString() },
];
const ANSWER_KEYS = [
  { id: "k1", title: "SSC CGL Tier 1 2024 Answer Key", released_on: new Date().toISOString() },
];
const ALERTS = [
  { id: "a1", title: "SSC CGL Tier 2 Admit Card Released", alert_date: new Date().toISOString() },
];

function Stat({ icon: Icon, value, label, sub, tone = "primary" }: { icon: any; value: string; label: string; sub?: string; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className={`h-10 w-10 rounded-lg grid place-items-center bg-${tone}/10 text-${tone}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-display font-bold leading-tight">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const { user } = useAuth();

  const { data: attemptsRes } = useQuery({
    queryKey: ["my-attempts"],
    queryFn: () => testAttemptService.getMyAttempts(),
  });
  const attempts = unwrapList<any>(attemptsRes).slice(0, 10);

  const completed = attempts.filter((a) => a.status === "completed" || a.status === "auto-submitted");
  const attempted = attempts.length;
  const pct = (a: any) => (a.test?.totalMarks ? (Number(a.score) / Number(a.test.totalMarks)) * 100 : 0);
  const avgScore = completed.length
    ? Math.round((completed.reduce((s, a) => s + pct(a), 0) / completed.length) * 10) / 10
    : 0;
  const bestScore = completed.length ? Math.round(Math.max(...completed.map(pct)) * 10) / 10 : 0;
  const accuracy = completed.length
    ? Math.round(
        (completed.reduce((s, a) => {
          const total = (a.correctCount ?? 0) + (a.wrongCount ?? 0);
          return s + (total ? (a.correctCount / total) * 100 : 0);
        }, 0) /
          completed.length) *
          10,
      ) / 10
    : 0;

  const name = user?.name?.split(" ")[0] ?? "Aspirant";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold">
            Welcome back, {name}! 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Let's continue your preparation and achieve your success.
          </p>
        </div>
        <Card className="px-4 py-2.5 flex items-center gap-3">
          <Flame className="h-5 w-5 text-warning" />
          <div>
            <div className="font-display font-bold text-xl leading-none">7</div>
            <div className="text-[11px] text-muted-foreground">Day Streak</div>
          </div>
          <div className="flex gap-1 ml-3">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span
                key={i}
                className="h-6 w-6 grid place-items-center text-[10px] rounded-full bg-success/15 text-success-foreground"
              >
                {d}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={ClipboardList} value={String(attempted)} label="Tests Attempted" />
        <Stat icon={Trophy} value={`${avgScore}%`} label="Average Score" tone="warning" />
        <Stat icon={BarChart3} value={`${bestScore}%`} label="Best Score" tone="success" />
        <Stat icon={Target} value={`${accuracy}%`} label="Accuracy" tone="info" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold">Recent Mock Tests</h3>
            <Link to="/dashboard/attempted-tests" className="text-xs text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {attempts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No attempts yet. Take your first mock test!
              </p>
            )}
            {attempts.slice(0, 4).map((a) => {
              const score = Math.round(pct(a));
              return (
                <div key={a._id} className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-primary mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.test?.title ?? "Test"}</div>
                    <div className="text-xs text-muted-foreground">Attempted on {new Date(a.startedAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Score</div>
                    <div className="text-sm font-semibold">{score}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold">All India Rank</h3>
            <Link to="/dashboard/rank" className="text-xs text-primary hover:underline">
              View Details
            </Link>
          </div>
          <div className="text-center py-4">
            <Trophy className="h-10 w-10 text-warning mx-auto" />
            <div className="text-xs text-muted-foreground mt-2">Take a test to see your rank on the leaderboard</div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-primary" />
              Daily Current Affairs
            </h3>
            <Link to="/dashboard/current-affairs" className="text-xs text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {CURRENT_AFFAIRS.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5">
                <Badge variant="outline" className="mt-0.5 text-[10px]">
                  {a.category}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-snug line-clamp-2">{a.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(a.published_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Previous Year Papers
            </h3>
            <Link
              to="/dashboard/previous-year-papers"
              className="text-xs text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {PYQS.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {p.title} ({p.shift})
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.questions_count} Qs · {p.marks} Marks · {p.duration_minutes} Min
                  </div>
                </div>
                <Button size="sm" variant="outline" disabled>Start Test</Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Answer Key
            </h3>
            <Link to="/dashboard/answer-key" className="text-xs text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {ANSWER_KEYS.map((k) => (
              <div key={k.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{k.title}</div>
                  <div className="text-[11px] text-muted-foreground">Released {new Date(k.released_on).toLocaleDateString()}</div>
                </div>
                <Button size="sm" variant="ghost" disabled>View Answer Key</Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Exam Alerts
            </h3>
            <Link to="/dashboard/exam-alerts" className="text-xs text-primary hover:underline">
              Manage Alerts
            </Link>
          </div>
          <div className="space-y-3">
            {ALERTS.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{a.title}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(a.alert_date).toLocaleDateString()}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
