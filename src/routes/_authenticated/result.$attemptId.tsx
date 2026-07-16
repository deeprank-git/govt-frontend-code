import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  RotateCcw,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as testAttemptService from "@/services/testAttemptService";
import { unwrapItem } from "@/lib/api-unwrap";

type ResultQuestion = {
  id?: string;
  _id?: string;
  questionText: string;
  options?: { key: string; text: string }[];
  correctAnswer?: string;
  explanation?: string;
  selectedOption?: string;
  isCorrect?: boolean;
};

type ResultAttempt = {
  test?: { id?: string; title?: string; totalMarks?: number; duration?: number };
  testId?: string;
  score?: number;
  totalMarks?: number;
  timeTakenSeconds?: number;
  time_taken_seconds?: number;
  correctCount?: number;
  wrongCount?: number;
  skippedCount?: number;
  questions?: ResultQuestion[];
};

export const Route = createFileRoute("/_authenticated/result/$attemptId")({
  component: ResultPage,
});

function ResultPage() {
  const { attemptId } = Route.useParams();

  const { data: raw } = useQuery({
    queryKey: ["attempt-result", attemptId],
    queryFn: async () => unwrapItem<ResultAttempt>(await testAttemptService.getResult(attemptId)),
  });
  const attempt = raw;

  if (!attempt) return <div className="p-8">Loading…</div>;

  const test = attempt.test ?? {};
  const questions: ResultQuestion[] = attempt.questions ?? [];
  const score = Number(attempt.score ?? 0);
  const totalMarks = Number(attempt.totalMarks ?? test.totalMarks ?? 1);
  const pct = Math.round((score / Math.max(1, totalMarks)) * 1000) / 10;
  const timeTakenSeconds = Number(attempt.timeTakenSeconds ?? attempt.time_taken_seconds ?? 0);
  const mins = Math.floor(timeTakenSeconds / 60);
  const secs = timeTakenSeconds % 60;
  const correctCount = attempt.correctCount ?? questions.filter((q) => q.isCorrect).length;
  const wrongCount =
    attempt.wrongCount ?? questions.filter((q) => q.selectedOption && !q.isCorrect).length;
  const skippedCount = attempt.skippedCount ?? questions.filter((q) => !q.selectedOption).length;

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="bg-background border-b border-border h-14 flex items-center px-4 lg:px-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="ml-3 font-display font-bold truncate">{test.title ?? "Test"}</h1>
        <Badge className="ml-2 bg-success/15 text-success-foreground border-transparent">
          Completed
        </Badge>
        <div className="ml-auto flex gap-2">
          <Button size="sm" asChild>
            <Link to="/test/$testId" params={{ testId: (attempt.test?.id ?? attempt.testId)! }}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Retake Test
            </Link>
          </Button>
        </div>
      </header>

      <div className="p-4 lg:p-6 space-y-5">
        <div className="text-xs text-muted-foreground">
          {totalMarks} Marks{test.duration ? ` · ${test.duration} Min` : ""}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Trophy} label="Score" value={`${score}/${totalMarks}`} sub={`${pct}%`} />
          <StatCard
            icon={Clock}
            label="Time Taken"
            value={`${mins}m ${secs}s`}
            sub={
              questions.length
                ? `Avg ${Math.round(timeTakenSeconds / questions.length)}s/q`
                : undefined
            }
          />
          <StatCard
            icon={CheckCircle2}
            label="Attempted"
            value={`${correctCount + wrongCount}/${questions.length}`}
            sub="questions"
            tone="success"
          />
          <StatCard
            icon={XCircle}
            label="Accuracy"
            value={`${correctCount + wrongCount ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 0}%`}
            sub="of attempted"
            tone="info"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <BreakdownCard
            icon={CheckCircle2}
            label="Correct"
            value={correctCount}
            pct={questions.length ? Math.round((correctCount / questions.length) * 100) : 0}
            tone="success"
          />
          <BreakdownCard
            icon={XCircle}
            label="Incorrect"
            value={wrongCount}
            pct={questions.length ? Math.round((wrongCount / questions.length) * 100) : 0}
            tone="destructive"
          />
          <BreakdownCard
            icon={MinusCircle}
            label="Unattempted"
            value={skippedCount}
            pct={questions.length ? Math.round((skippedCount / questions.length) * 100) : 0}
          />
        </div>

        <Card className="p-5">
          <h3 className="font-display font-bold mb-4">Question Analysis</h3>
          <div className="space-y-4">
            {questions.map((q: ResultQuestion, i: number) => {
              const yourAns = q.selectedOption;
              const correct = q.isCorrect ?? yourAns === q.correctAnswer;
              return (
                <div key={q.id ?? q._id ?? i} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground">Q.{i + 1}</div>
                    {yourAns ? (
                      correct ? (
                        <Badge className="bg-success/15 text-success-foreground border-transparent">
                          Correct
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Incorrect</Badge>
                      )
                    ) : (
                      <Badge variant="outline">Skipped</Badge>
                    )}
                  </div>
                  <div className="font-medium">{q.questionText}</div>
                  <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
                    {q.options?.map((o) => {
                      const isCorrect = o.key === q.correctAnswer;
                      const isYour = o.key === yourAns;
                      return (
                        <div
                          key={o.key}
                          className={`rounded-md border px-3 py-2 ${isCorrect ? "border-success bg-success/5" : isYour ? "border-destructive bg-destructive/5" : "border-border"}`}
                        >
                          <span className="font-semibold mr-2">{o.key}.</span>
                          {o.text}
                          {isCorrect && (
                            <span className="ml-2 text-xs text-success-foreground">
                              ✓ Correct Answer
                            </span>
                          )}
                          {isYour && !isCorrect && (
                            <span className="ml-2 text-xs text-destructive">Your Answer</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      <b>Explanation:</b> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
            {questions.length === 0 && (
              <p className="text-sm text-muted-foreground">No question breakdown available.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone = "primary" }: any) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`h-4 w-4 text-${tone}`} />
        {label}
      </div>
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
      <div className="text-xs text-muted-foreground">
        {label}
        {pct ? ` · ${pct}%` : ""}
      </div>
    </Card>
  );
}
