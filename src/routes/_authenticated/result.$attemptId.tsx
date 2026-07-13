import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, RotateCcw, Trophy, Target, Clock, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/result/$attemptId")({
  component: ResultPage,
});

function ResultPage() {
  const { attemptId } = Route.useParams();

  const { data: attempt } = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: async () => (await supabase.from("attempts").select("*, mock_tests(title, total_marks, duration_minutes)").eq("id", attemptId).maybeSingle()).data,
  });
  const { data: questions = [] } = useQuery({
    queryKey: ["attempt-qs", attemptId],
    enabled: !!attempt?.id,
    queryFn: async () =>
      (await (supabase.rpc as any)("get_attempt_questions", { _attempt_id: attemptId })).data ?? [],
  });

  if (!attempt) return <div className="p-8">Loading…</div>;
  const sectionStats = (attempt.section_analysis ?? []) as { name: string; total: number; correct: number; wrong: number; score: number }[];
  const score = Number(attempt.score ?? 0);
  const totalMarks = Number(attempt.total_marks ?? 1);
  const pct = Math.round((score / Math.max(1, totalMarks)) * 1000) / 10;
  const mins = Math.floor(Number(attempt.time_taken_seconds ?? 0) / 60);
  const secs = Number(attempt.time_taken_seconds ?? 0) % 60;
  const answers = (attempt.answers ?? {}) as Record<string, string>;

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="bg-background border-b border-border h-14 flex items-center px-4 lg:px-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" />Back to Dashboard</Link>
        </Button>
        <h1 className="ml-3 font-display font-bold truncate">{attempt.mock_tests?.title}</h1>
        <Badge className="ml-2 bg-success/15 text-success-foreground border-transparent">Completed</Badge>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Download Report</Button>
          <Button size="sm" asChild><Link to="/test/$testId" params={{ testId: attempt.test_id }}><RotateCcw className="h-4 w-4 mr-1" />Retake Test</Link></Button>
        </div>
      </header>

      <div className="p-4 lg:p-6 space-y-5">
        <div className="text-xs text-muted-foreground">
          Completed on {new Date(attempt.submitted_at ?? attempt.started_at).toLocaleDateString()} · {attempt.mock_tests?.duration_minutes} Min · {totalMarks} Marks
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Trophy} label="Score" value={`${score}/${totalMarks}`} sub={`${pct}%`} />
          <StatCard icon={Trophy} label="Rank" value={`214/15,432`} sub="Top 1.4%" tone="warning" />
          <StatCard icon={Target} label="Percentile" value={`${Number(attempt.percentile ?? 0).toFixed(1)}%`} sub="Above 98% aspirants" tone="info" />
          <StatCard icon={Target} label="Accuracy" value={`${Number(attempt.accuracy ?? 0).toFixed(1)}%`} sub="Good answer" tone="success" />
          <StatCard icon={Clock} label="Time Taken" value={`${mins}m ${secs}s`} sub={`Avg ${Math.round(Number(attempt.time_taken_seconds)/Math.max(1,questions.length))}s/q`} />
          <StatCard icon={CheckCircle2} label="Attempted" value={`${(attempt.correct_count ?? 0) + (attempt.wrong_count ?? 0)}/${questions.length}`} sub="Great attempt!" tone="success" />
        </div>

        <div className="grid lg:grid-cols-4 gap-4">
          <BreakdownCard icon={CheckCircle2} label="Correct" value={attempt.correct_count ?? 0} pct={questions.length ? Math.round(((attempt.correct_count ?? 0) / questions.length) * 100) : 0} tone="success" />
          <BreakdownCard icon={XCircle} label="Incorrect" value={attempt.wrong_count ?? 0} pct={questions.length ? Math.round(((attempt.wrong_count ?? 0) / questions.length) * 100) : 0} tone="destructive" />
          <BreakdownCard icon={MinusCircle} label="Unattempted" value={attempt.skipped_count ?? 0} pct={questions.length ? Math.round(((attempt.skipped_count ?? 0) / questions.length) * 100) : 0} />
          <BreakdownCard icon={MinusCircle} label="Marked for Review" value={(attempt.marked_for_review as string[])?.length ?? 0} pct={0} tone="warning" />
        </div>

        <Card className="p-5">
          <h3 className="font-display font-bold mb-4">Section Wise Performance</h3>
          <div className="space-y-3">
            {sectionStats.map((s) => (
              <div key={s.name} className="grid grid-cols-[1.5fr_1fr_auto_auto] items-center gap-4 text-sm">
                <div className="font-medium">{s.name}</div>
                <Progress value={s.total ? (s.correct / s.total) * 100 : 0} className="h-2" />
                <div className="text-xs text-muted-foreground">Score <b className="text-foreground">{s.score}</b></div>
                <div className="text-xs text-muted-foreground">Accuracy <b className="text-foreground">{s.total ? Math.round((s.correct / s.total) * 100) : 0}%</b></div>
              </div>
            ))}
            {sectionStats.length === 0 && <p className="text-sm text-muted-foreground">No section data.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold mb-4">Question Analysis</h3>
          <div className="space-y-4">
            {questions.map((q: any, i: number) => {
              const yourAns = answers[q.id];
              const correct = yourAns === q.correct_answer;
              return (
                <div key={q.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground">Q.{i + 1} · {q.section}</div>
                    {yourAns ? (
                      correct
                        ? <Badge className="bg-success/15 text-success-foreground border-transparent">Correct</Badge>
                        : <Badge variant="destructive">Incorrect</Badge>
                    ) : <Badge variant="outline">Skipped</Badge>}
                  </div>
                  <div className="font-medium">{q.question_text}</div>
                  <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
                    {(q.options as any[]).map((o) => {
                      const isCorrect = o.key === q.correct_answer;
                      const isYour = o.key === yourAns;
                      return (
                        <div key={o.key} className={`rounded-md border px-3 py-2 ${isCorrect ? "border-success bg-success/5" : isYour ? "border-destructive bg-destructive/5" : "border-border"}`}>
                          <span className="font-semibold mr-2">{o.key}.</span>{o.text}
                          {isCorrect && <span className="ml-2 text-xs text-success-foreground">✓ Correct Answer</span>}
                          {isYour && !isCorrect && <span className="ml-2 text-xs text-destructive">Your Answer</span>}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <div className="mt-3 text-xs text-muted-foreground"><b>Explanation:</b> {q.explanation}</div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone = "primary" }: any) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className={`h-4 w-4 text-${tone}`} />{label}</div>
      <div className="text-xl font-display font-bold mt-1">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </Card>
  );
}
function BreakdownCard({ icon: Icon, label, value, pct, tone = "primary" }: any) {
  return (
    <Card className="p-4 text-center">
      <Icon className={`h-7 w-7 mx-auto text-${tone}`} />
      <div className="text-3xl font-display font-extrabold mt-2">{value}</div>
      <div className="text-xs text-muted-foreground">{label}{pct ? ` · ${pct}%` : ""}</div>
    </Card>
  );
}
