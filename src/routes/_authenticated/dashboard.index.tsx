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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Dashboard,
});

function Stat({
  icon: Icon,
  value,
  label,
  sub,
  tone = "primary",
}: {
  icon: any;
  value: string;
  label: string;
  sub?: string;
  tone?: string;
}) {
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

  const { data: attempts = [] } = useQuery({
    queryKey: ["my-attempts", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (
        await supabase
          .from("attempts")
          .select("*, mock_tests(title, total_marks)")
          .eq("user_id", user!.id)
          .order("started_at", { ascending: false })
          .limit(10)
      ).data ?? [],
  });
  const { data: pyqs = [] } = useQuery({
    queryKey: ["dash-pyqs"],
    queryFn: async () =>
      (await supabase.from("pyqs").select("*").order("paper_date", { ascending: false }).limit(4))
        .data ?? [],
  });
  const { data: ca = [] } = useQuery({
    queryKey: ["dash-ca"],
    queryFn: async () =>
      (
        await supabase
          .from("current_affairs")
          .select("*")
          .order("published_at", { ascending: false })
          .limit(4)
      ).data ?? [],
  });
  const { data: keys = [] } = useQuery({
    queryKey: ["dash-keys"],
    queryFn: async () =>
      (
        await supabase
          .from("answer_keys")
          .select("*")
          .order("released_on", { ascending: false })
          .limit(4)
      ).data ?? [],
  });
  const { data: alerts = [] } = useQuery({
    queryKey: ["dash-alerts"],
    queryFn: async () =>
      (await supabase.from("notifications").select("*").order("alert_date").limit(4)).data ?? [],
  });

  const completed = attempts.filter((a) => a.status === "completed");
  const attempted = attempts.length;
  const avgScore = completed.length
    ? Math.round(
        (completed.reduce(
          (s, a) => s + (a.total_marks ? (Number(a.score) / Number(a.total_marks)) * 100 : 0),
          0,
        ) /
          completed.length) *
          10,
      ) / 10
    : 0;
  const bestScore = completed.length
    ? Math.round(
        Math.max(
          ...completed.map((a) =>
            a.total_marks ? (Number(a.score) / Number(a.total_marks)) * 100 : 0,
          ),
        ) * 10,
      ) / 10
    : 0;
  const accuracy = completed.length
    ? Math.round(
        (completed.reduce((s, a) => s + Number(a.accuracy || 0), 0) / completed.length) * 10,
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
        <Stat
          icon={ClipboardList}
          value={String(attempted)}
          label="Tests Attempted"
          sub="+12 this week"
        />
        <Stat
          icon={Trophy}
          value={`${avgScore}%`}
          label="Average Score"
          sub="+0.6% this week"
          tone="warning"
        />
        <Stat
          icon={BarChart3}
          value={`${bestScore}%`}
          label="Best Score"
          sub="In SSC CGL Mock Test 06"
          tone="success"
        />
        <Stat
          icon={Target}
          value={`${accuracy}%`}
          label="Accuracy"
          sub="+0.3% this week"
          tone="info"
        />
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
              const score = a.total_marks
                ? Math.round((Number(a.score) / Number(a.total_marks)) * 100)
                : 0;
              return (
                <div key={a.id} className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-primary mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {a.mock_tests?.title ?? "Test"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Attempted on {new Date(a.started_at).toLocaleDateString()}
                    </div>
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
            <div className="text-xs text-muted-foreground mt-2">Your All India Rank</div>
            <div className="text-3xl font-display font-extrabold">12,846</div>
            <Badge className="bg-success/15 text-success-foreground border-transparent mt-1">
              Percentile 93.42%
            </Badge>
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
            {ca.map((a) => (
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
            {pyqs.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {p.title} ({p.shift})
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.questions_count} Qs · {p.marks} Marks · {p.duration_minutes} Min
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  Start Test
                </Button>
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
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{k.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Released {k.released_on ? new Date(k.released_on).toLocaleDateString() : "—"}
                  </div>
                </div>
                <Button size="sm" variant="ghost">
                  View Answer Key
                </Button>
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
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{a.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {a.alert_date ? new Date(a.alert_date).toLocaleDateString() : "Soon"}
                  </div>
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
