import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, RotateCcw, Trophy, Target, Clock, CheckCircle2, XCircle, MinusCircle, Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import * as testAttemptService from "@/services/testAttemptService";
import * as reportService from "@/services/reportService";
import { unwrapItem } from "@/lib/api-unwrap";

export const Route = createFileRoute("/_authenticated/result/$attemptId")({
  component: ResultPage,
});

const OPTION_LETTERS = ["A", "B", "C", "D"];

function ResultPage() {
  const { attemptId } = Route.useParams();
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data: resultRes, isLoading } = useQuery({
    queryKey: ["attempt-result", attemptId],
    queryFn: () => testAttemptService.getResult(attemptId),
  });
  const result = unwrapItem<any>(resultRes);

  const reportMut = useMutation({
    mutationFn: () => reportService.reportQuestion({ questionId: reportingId!, reason }),
    onSuccess: () => {
      toast.success("Thanks — we'll take a look at this question.");
      setReportingId(null);
      setReason("");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not submit report"),
  });

  if (isLoading) return <div className="p-8">Loading…</div>;
  if (!result) return <div className="p-8">Could not load this result.</div>;

  const totalMarks = Number(result.totalMarks ?? 1);
  const score = Number(result.score ?? 0);
  const breakdown = (result.breakdown ?? []) as any[];
  const totalQuestions = result.test?.totalQuestions ?? breakdown.length;

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="bg-background border-b border-border h-14 flex items-center px-4 lg:px-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="ml-3 font-display font-bold truncate">{result.test?.title}</h1>
        <Badge className="ml-2 bg-success/15 text-success-foreground border-transparent capitalize">{result.status?.replace("-", " ")}</Badge>
        <div className="ml-auto flex gap-2">
          <Button size="sm" asChild><Link to="/test/$testId" params={{ testId: String(result.test?._id ?? result.test) }}><RotateCcw className="h-4 w-4 mr-1" />Retake Test</Link></Button>
        </div>
      </header>

      <div className="p-4 lg:p-6 space-y-5">
        <div className="text-xs text-muted-foreground">
          Completed on {new Date(result.submittedAt ?? result.startedAt).toLocaleDateString()} · {result.test?.duration} Min · {totalMarks} Marks
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard icon={Trophy} label="Score" value={`${score}/${totalMarks}`} sub={`${result.percentage ?? 0}%`} />
          <StatCard icon={Target} label="Correct" value={result.correctCount ?? 0} tone="success" />
          <StatCard icon={Target} label="Wrong" value={result.wrongCount ?? 0} tone="destructive" />
          <StatCard icon={Clock} label="Unattempted" value={result.unattempted ?? 0} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <BreakdownCard icon={CheckCircle2} label="Correct" value={result.correctCount ?? 0} pct={totalQuestions ? Math.round(((result.correctCount ?? 0) / totalQuestions) * 100) : 0} tone="success" />
          <BreakdownCard icon={XCircle} label="Incorrect" value={result.wrongCount ?? 0} pct={totalQuestions ? Math.round(((result.wrongCount ?? 0) / totalQuestions) * 100) : 0} tone="destructive" />
          <BreakdownCard icon={MinusCircle} label="Unattempted" value={result.unattempted ?? 0} pct={totalQuestions ? Math.round(((result.unattempted ?? 0) / totalQuestions) * 100) : 0} />
        </div>

        <Card className="p-5">
          <h3 className="font-display font-bold mb-4">Question Analysis</h3>
          <div className="space-y-4">
            {breakdown.map((q, i) => (
              <div key={q.questionId} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground">Q.{i + 1}</div>
                  <div className="flex items-center gap-2">
                    {q.attempted ? (
                      q.isCorrect
                        ? <Badge className="bg-success/15 text-success-foreground border-transparent">Correct</Badge>
                        : <Badge variant="destructive">Incorrect</Badge>
                    ) : <Badge variant="outline">Skipped</Badge>}
                    <button
                      onClick={() => { setReportingId(q.questionId); setReason(""); }}
                      className="text-muted-foreground hover:text-destructive"
                      title="Report an issue with this question"
                    >
                      <Flag className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="font-medium">{q.questionText}</div>
                <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
                  {(q.options as any[]).map((o, oi) => {
                    const isCorrect = oi === q.correctAnswer;
                    const isYour = oi === q.selectedOption;
                    return (
                      <div key={oi} className={`rounded-md border px-3 py-2 ${isCorrect ? "border-success bg-success/5" : isYour ? "border-destructive bg-destructive/5" : "border-border"}`}>
                        <span className="font-semibold mr-2">{OPTION_LETTERS[oi]}.</span>{o.text}
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
            ))}
          </div>
        </Card>
      </div>

      <Dialog open={!!reportingId} onOpenChange={(open) => !open && setReportingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
            <DialogDescription>What's wrong with this question? (e.g. wrong answer, typo, unclear wording)</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the issue…" rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportingId(null)}>Cancel</Button>
            <Button onClick={() => reportMut.mutate()} disabled={reportMut.isPending || !reason.trim()}>
              {reportMut.isPending ? "Submitting…" : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
