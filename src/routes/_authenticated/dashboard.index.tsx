import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
import * as testService from "@/services/testService";
import * as testAttemptService from "@/services/testAttemptService";
import * as currentAffairsService from "@/services/currentAffairsService";
import { unwrapList } from "@/lib/api-unwrap";
import { useAuth } from "@/hooks/use-auth";
import { ArticleImage } from "@/components/site/ArticleImage";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Dashboard,
});

// No backend endpoint exists yet for answer keys or exam alerts — these two
// widgets stay on static placeholder content until those resources are added
// to the API. Current Affairs and Previous Year Papers are wired to the real
// backend below.
const ANSWER_KEYS = [
  { id: "k1", title: "SSC CGL Tier 1 2024 Answer Key", released_on: new Date().toISOString() },
];
const ALERTS = [
  { id: "a1", title: "SSC CGL Tier 2 Admit Card Released", alert_date: new Date().toISOString() },
];

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getActiveDayKeys(completedAttempts: { submittedAt?: string }[]): Set<string> {
  const keys = new Set<string>();
  for (const a of completedAttempts) {
    if (a.submittedAt) keys.add(toDayKey(new Date(a.submittedAt)));
  }
  return keys;
}

function computeStreak(activeDays: Set<string>, today: Date): number {
  const todayKey = toDayKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDayKey(yesterday);

  let cursor: Date;
  if (activeDays.has(todayKey)) {
    cursor = new Date(today);
  } else if (activeDays.has(yesterdayKey)) {
    cursor = new Date(yesterday);
  } else {
    return 0;
  }

  let streak = 0;
  while (activeDays.has(toDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getLastSevenDays(today: Date): Date[] {
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

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
  const navigate = useNavigate();

  const { data: attemptsRes } = useQuery({
    queryKey: ["my-attempts"],
    queryFn: () => testAttemptService.getMyAttempts(),
  });
  const attempts = unwrapList<any>(attemptsRes).slice(0, 10);

  const { data: caRes } = useQuery({
    queryKey: ["dashboard-home-ca"],
    queryFn: () => currentAffairsService.getCurrentAffairs({ limit: 3 }),
  });
  const currentAffairs = unwrapList<any>(caRes);

  const { data: pyqRes } = useQuery({
    queryKey: ["dashboard-home-pyq"],
    queryFn: () => testService.getTests({ paperType: "previous_year" }),
  });
  const previousYearPapers = unwrapList<any>(pyqRes)
    .slice()
    .sort((a, b) => new Date(b.examDate ?? 0).getTime() - new Date(a.examDate ?? 0).getTime())
    .slice(0, 3);

  const startPyq = (testId: string) => navigate({ to: "/test/$testId/instructions", params: { testId } });

  const completed = attempts.filter((a) => a.status === "completed" || a.status === "auto-submitted");
  const attempted = attempts.length;
  const today = new Date();
  const activeDayKeys = getActiveDayKeys(completed);
  const streak = computeStreak(activeDayKeys, today);
  const last7Days = getLastSevenDays(today);
  const todayKey = toDayKey(today);
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
            <div className="font-display font-bold text-xl leading-none">{streak}</div>
            <div className="text-[11px] text-muted-foreground">Day Streak</div>
          </div>
          <div className="flex gap-1 ml-3">
            {last7Days.map((d) => {
              const key = toDayKey(d);
              const isActive = activeDayKeys.has(key);
              const isToday = key === todayKey;
              return (
                <span
                  key={key}
                  className={`h-6 w-6 grid place-items-center text-[10px] rounded-full ${
                    isActive
                      ? "bg-success/15 text-success-foreground"
                      : isToday
                        ? "bg-muted text-muted-foreground"
                        : "bg-muted/40 text-muted-foreground/60"
                  }`}
                >
                  {WEEKDAY_LETTERS[d.getDay()]}
                </span>
              );
            })}
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
            {previousYearPapers.length === 0 && (
              <p className="text-sm text-muted-foreground">No previous year papers yet.</p>
            )}
            {previousYearPapers.map((p) => (
              <div key={p._id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.totalQuestions ?? 0} Qs · {p.totalMarks ?? 0} Marks · {p.duration ?? 0} Min
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => startPyq(p._id)}>
                  Start Test
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
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
            {currentAffairs.map((a) => (
              <Link key={a._id} to="/dashboard/current-affairs/$id" params={{ id: a._id }} className="flex items-start gap-2.5 hover:bg-muted/40 -mx-1 px-1 py-0.5 rounded transition">
                <ArticleImage image={a.image} alt={a.title} className="h-10 w-14 rounded-md" />
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="text-[10px]">
                    {a.category}
                  </Badge>
                  <div className="text-sm font-medium leading-snug line-clamp-2 mt-0.5">{a.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(a.date).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
            {currentAffairs.length === 0 && <p className="text-sm text-muted-foreground">No current affairs yet.</p>}
          </div>
        </Card>

        {/* Answer Key and Exam Alerts are still fully static/mock-data — hidden
            from the dashboard and sidebar until real backend support exists.
            Commented out (not deleted) so they're easy to bring back later. */}
        {/*
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
        */}
      </div>
    </div>
  );
}
