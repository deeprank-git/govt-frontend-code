import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft, RotateCcw, Trophy, Target, Percent, CheckCircle2, Clock,
  Download, Award, Flag, ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import * as testAttemptService from "@/services/testAttemptService";
import * as testService from "@/services/testService";
import * as leaderboardService from "@/services/leaderboardService";
import * as reportService from "@/services/reportService";
import { unwrapItem, unwrapList } from "@/lib/api-unwrap";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/result/$attemptId")({
  component: ResultPage,
});

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];
const TABS = ["all", "correct", "incorrect", "skipped", "review"] as const;

function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
}

function ResultPage() {
  const { attemptId } = Route.useParams();
  const { user } = useAuth();
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("all");
  const [selected, setSelected] = useState(0);

  const { data: resultRes, isLoading } = useQuery({
    queryKey: ["attempt-result", attemptId],
    queryFn: () => testAttemptService.getResult(attemptId),
  });
  const result = unwrapItem<any>(resultRes);
  const testId: string | undefined = result?.test?._id ?? (typeof result?.test === "string" ? result.test : undefined);

  // The result response's `test` sub-object doesn't include `sections` —
  // fetch the full Test doc separately for section-wise performance.
  const { data: testRes } = useQuery({
    queryKey: ["test-detail", testId],
    queryFn: () => testService.getTestById(testId!),
    enabled: !!testId,
  });
  const sections: any[] = unwrapItem<any>(testRes)?.sections ?? [];

  // Rank/percentile have no dedicated "my rank" endpoint — pull the top of
  // the leaderboard (capped at 100 by the API) and look for this user in it.
  // If they're ranked below 100th, there's no way to know their real rank
  // from this endpoint, so the card is hidden rather than showing something
  // wrong.
  const { data: leaderboardRes } = useQuery({
    queryKey: ["leaderboard", testId],
    queryFn: () => leaderboardService.getLeaderboard(testId!, 100),
    enabled: !!testId,
  });
  const leaderboardRows = unwrapList<any>(leaderboardRes);
  const myRank = leaderboardRows.find((r) => r.userId === user?.id);
  const rankCount = (leaderboardRes as any)?.count ?? leaderboardRows.length;
  const percentile = myRank ? Math.max(0, Math.round((1 - (myRank.rank - 1) / rankCount) * 1000) / 10) : null;

  // "Marked for review" has no backend field at all — it only ever existed
  // as local state during the live attempt. It's bridged through
  // sessionStorage at submit time (see test.$testId.tsx); if that key isn't
  // present (different session/device, or an older attempt), review status
  // is simply unavailable and treated as empty rather than guessed.
  const [reviewedIdx, setReviewedIdx] = useState<Set<number>>(new Set());
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`marked-${attemptId}`);
      if (raw) setReviewedIdx(new Set(JSON.parse(raw) as number[]));
    } catch {
      // ignore — leave empty
    }
  }, [attemptId]);

  const reportMut = useMutation({
    mutationFn: () => reportService.reportQuestion({ questionId: reportingId!, reason }),
    onSuccess: () => {
      toast.success("Thanks — we'll take a look at this question.");
      setReportingId(null);
      setReason("");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not submit report"),
  });

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading result…</div>;
  if (!result) return <div className="p-8 text-sm text-muted-foreground">Could not load this result.</div>;

  const totalMarks = Number(result.totalMarks ?? 1);
  const score = Number(result.score ?? 0);
  const breakdown = (result.breakdown ?? []) as any[];
  const totalQuestions = result.test?.totalQuestions ?? breakdown.length;
  const correctCount = result.correctCount ?? 0;
  const wrongCount = result.wrongCount ?? 0;
  const unattempted = result.unattempted ?? 0;
  const reviewedCount = reviewedIdx.size;
  const accuracy = correctCount + wrongCount ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 0;
  const timeTakenMs = result.submittedAt && result.startedAt
    ? new Date(result.submittedAt).getTime() - new Date(result.startedAt).getTime()
    : null;

  // Every question in `breakdown` is assumed to carry equal marks (the
  // response doesn't include a per-question `marks` field to compute this
  // exactly), so section "Score" below is `correctInSection * avgMarks` —
  // an approximation, not an exact per-section total.
  const avgMarksPerQuestion = totalQuestions ? totalMarks / totalQuestions : 0;

  const sectionRanges = (() => {
    let cursor = 0;
    return sections.map((s) => {
      const start = cursor;
      const end = cursor + (s.no_of_questions || 0) - 1;
      cursor += s.no_of_questions || 0;
      return { section: s, start, end };
    });
  })();

  const questionStatus = (i: number): "correct" | "incorrect" | "skipped" => {
    const q = breakdown[i];
    if (!q?.attempted) return "skipped";
    return q.isCorrect ? "correct" : "incorrect";
  };

  const filteredIndices = breakdown
    .map((_, i) => i)
    .filter((i) => {
      if (activeTab === "all") return true;
      if (activeTab === "review") return reviewedIdx.has(i);
      return questionStatus(i) === activeTab;
    });

  const selectQuestion = (i: number) => setSelected(i);
  const current = breakdown[selected];

  const statusClass: Record<string, string> = {
    correct: "bg-success text-white",
    incorrect: "bg-destructive text-white",
    skipped: "bg-muted text-foreground",
  };

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="bg-background border-b border-border flex items-center px-4 lg:px-6 py-3 flex-wrap gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" />Back to Dashboard</Link>
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-bold truncate min-w-0">{result.test?.title}</h1>
            <Badge className="bg-success/15 text-success-foreground border-transparent capitalize">{result.status?.replace("-", " ")}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Completed on {new Date(result.submittedAt ?? result.startedAt).toLocaleDateString()} · {result.test?.duration} Min · {totalMarks} Marks
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          {/* Download Report button — commented out per request 2026-07-31
          <Button size="sm" variant="outline" disabled title="Report generation isn't available yet">
            <Download className="h-4 w-4 mr-1" /> Download Report
          </Button>
          */}
          <Button size="sm" asChild>
            <Link to="/test/$testId/instructions" params={{ testId: String(testId) }}><RotateCcw className="h-4 w-4 mr-1" />Retake Test</Link>
          </Button>
        </div>
      </header>

      <div className="p-4 lg:p-6 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon={Trophy} tone="primary" label="Score" value={`${score}/${totalMarks}`} sub={`${result.percentage ?? 0}%`} />
          <StatCard
            icon={Award}
            tone="success"
            label="Rank"
            value={myRank ? `${myRank.rank}/${rankCount}` : "—"}
            sub={myRank ? "Ranked Attempt" : "Not in top 100"}
          />
          <StatCard icon={Percent} tone="info" label="Percentile" value={percentile !== null ? `${percentile}%` : "—"} sub={percentile !== null ? `Better than ${percentile}% Aspirants` : "Unavailable"} />
          <StatCard icon={Target} tone="warning" label="Accuracy" value={`${accuracy}%`} sub={accuracy >= 70 ? "Good Accuracy" : "Keep practicing"} />
          <StatCard icon={Clock} tone="primary" label="Time Taken" value={timeTakenMs !== null ? formatDuration(timeTakenMs) : "—"} sub={`${result.test?.duration ?? "—"}m Allotted`} />
        </div>

        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-4">
          {/* Circular breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <DonutCard value={correctCount} total={totalQuestions} color="stroke-success" label="Correct" />
            <DonutCard value={wrongCount} total={totalQuestions} color="stroke-destructive" label="Incorrect" />
            <DonutCard value={unattempted} total={totalQuestions} color="stroke-muted-foreground" label="Unattempted" />
            <DonutCard value={reviewedCount} total={totalQuestions} color="stroke-purple-500" label="Marked for Review" />
          </div>

          {/* Section wise performance */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-sm">Section Wise Performance</h3>
            </div>
            {sectionRanges.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">This test has no sections configured.</p>
            ) : (
              <div className="space-y-3">
                {sectionRanges.map((r) => {
                  const slice = breakdown.slice(r.start, r.end + 1);
                  const correct = slice.filter((q) => q.attempted && q.isCorrect).length;
                  const attempted = slice.filter((q) => q.attempted).length;
                  const acc = attempted ? Math.round((correct / attempted) * 100) : 0;
                  const sectionScore = Math.round(correct * avgMarksPerQuestion);
                  const sectionMax = Math.round(slice.length * avgMarksPerQuestion);
                  return (
                    <div key={r.section._id ?? r.section.name} className="text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate min-w-0">{r.section.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{sectionScore}/{sectionMax} · {acc}% · {attempted}/{slice.length}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <span className={cn("block h-full", acc >= 70 ? "bg-success" : acc >= 40 ? "bg-warning" : "bg-destructive")} style={{ width: `${acc}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Question review */}
        <div className="grid lg:grid-cols-[1fr_280px] gap-4 items-start">
          <Card className="p-5">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); }}>
              <TabsList className="bg-transparent p-0 h-auto flex flex-wrap gap-1 justify-start border-b border-border w-full rounded-none mb-4">
                <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">All Questions ({totalQuestions})</TabsTrigger>
                <TabsTrigger value="correct" className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Correct ({correctCount})</TabsTrigger>
                <TabsTrigger value="incorrect" className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Incorrect ({wrongCount})</TabsTrigger>
                <TabsTrigger value="skipped" className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Skipped ({unattempted})</TabsTrigger>
                <TabsTrigger value="review" className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Review ({reviewedCount})</TabsTrigger>
              </TabsList>
            </Tabs>

            {filteredIndices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">No questions in this category.</p>
            ) : !current ? null : (
              <div>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Question {selected + 1}</span>
                    {reviewedIdx.has(selected) && <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-600">Marked for Review</Badge>}
                  </div>
                  <button
                    onClick={() => { setReportingId(current.questionId); setReason(""); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Flag className="h-3.5 w-3.5" /> Report Question
                  </button>
                </div>
                <p className="text-[15px] leading-7 mb-5">{current.questionText}</p>
                <div className="space-y-2 mb-5">
                  {(current.options as any[]).map((o, oi) => {
                    const isCorrect = oi === current.correctAnswer;
                    const isYour = oi === current.selectedOption;
                    return (
                      <div
                        key={oi}
                        className={cn(
                          "rounded-lg border px-4 py-2.5 text-sm",
                          isCorrect ? "border-success bg-success/5" : isYour ? "border-destructive bg-destructive/5" : "border-border",
                        )}
                      >
                        <span className="font-semibold mr-2">{OPTION_LETTERS[oi]}.</span>{o.text}
                        {isCorrect && <span className="ml-2 text-xs text-success-foreground font-medium">✓ Correct Answer</span>}
                        {isYour && !isCorrect && <span className="ml-2 text-xs text-destructive font-medium">✗ Your Answer</span>}
                      </div>
                    );
                  })}
                </div>
                {current.explanation && (
                  <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                    <div className="font-semibold text-foreground mb-1 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Explanation</div>
                    {current.explanation}
                  </div>
                )}
                <div className="flex items-center justify-between mt-5 flex-wrap gap-3">
                  <Button
                    variant="outline"
                    disabled={filteredIndices.indexOf(selected) <= 0}
                    onClick={() => selectQuestion(filteredIndices[filteredIndices.indexOf(selected) - 1])}
                  >
                    Previous
                  </Button>
                  <Button
                    disabled={filteredIndices.indexOf(selected) >= filteredIndices.length - 1}
                    onClick={() => selectQuestion(filteredIndices[filteredIndices.indexOf(selected) + 1])}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Question palette */}
          <Card className="p-4 h-fit">
            <h4 className="font-display font-bold text-sm mb-3">Question Palette</h4>
            <div className="grid grid-cols-5 gap-2">
              {breakdown.map((_, i) => {
                const st = questionStatus(i);
                return (
                  <button
                    key={i}
                    onClick={() => { setActiveTab("all"); selectQuestion(i); }}
                    className={cn(
                      "h-9 rounded-md text-sm font-semibold relative",
                      statusClass[st],
                      i === selected && "ring-2 ring-primary ring-offset-1",
                    )}
                  >
                    {i + 1}
                    {reviewedIdx.has(i) && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-purple-500 ring-1 ring-background" />}
                  </button>
                );
              })}
            </div>
            {/* <Button variant="outline" className="w-full mt-4" onClick={() => selectQuestion(selected)}>
              Go to Question
            </Button> */}
          </Card>
        </div>
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

function StatCard({ icon: Icon, label, value, sub, tone = "primary" }: { icon: any; label: string; value: string; sub?: string; tone?: string }) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
  };
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <span className={cn("h-8 w-8 rounded-lg grid place-items-center shrink-0", toneMap[tone])}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs text-muted-foreground truncate min-w-0">{label}</span>
      </div>
      <div className="text-xl font-display font-bold mt-2">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
    </Card>
  );
}

function DonutCard({ value, total, color, label }: { value: number; total: number; color: string; label: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = total ? value / total : 0;
  const offset = c - pct * c;
  return (
    <Card className="p-4 text-center">
      <div className="relative h-16 w-16 mx-auto">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} className="stroke-muted" strokeWidth="6" fill="none" />
          <circle
            cx="32" cy="32" r={r}
            className={color}
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center font-display font-bold text-sm">{value}</div>
      </div>
      <div className="text-xs text-muted-foreground mt-2">{label}</div>
    </Card>
  );
}
