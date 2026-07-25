import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, ChevronLeft, ChevronRight, Bookmark, AlertCircle, Flag, FileText, Award, AlertTriangle, Pause, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import * as testAttemptService from "@/services/testAttemptService";
import * as testService from "@/services/testService";
import * as questionService from "@/services/questionService";
import * as reportService from "@/services/reportService";
import { unwrapItem, unwrapList } from "@/lib/api-unwrap";
import { Logo } from "@/components/site/Logo";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/test/$testId")({
  component: TestEngine,
});

const OPTION_LETTERS = ["A", "B", "C", "D"];

type Question = {
  _id: string;
  questionText: string;
  options: { text: string }[];
  marks: number;
  negativeMarks: number;
};

function TestEngine() {
  const { testId } = Route.useParams();
  const navigate = useNavigate();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [visited, setVisited] = useState<Set<number>>(new Set());

  const [time, setTime] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);

  const { data: testRes } = useQuery({
    queryKey: ["test-detail", testId],
    queryFn: () => testService.getTestById(testId),
  });
  const test = unwrapItem<any>(testRes);
  const sections: any[] = test?.sections ?? [];

  // Each question now carries its own `section` (an ObjectId into
  // test.sections[]) — fetch the full question list (index/order + section
  // only, no answers) once so every question can be bucketed by its real
  // section instead of guessing from the admin-configured no_of_questions
  // counts. Sorted by `order` to line up with the attempt's 0-based index.
  const { data: questionsRes } = useQuery({
    queryKey: ["test-questions", testId],
    queryFn: () => questionService.getQuestionsByTest(testId),
  });
  const orderedQuestions = useMemo(() => {
    const list = unwrapList<any>(questionsRes);
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [questionsRes]);

  const sectionBuckets = useMemo(() => {
    if (sections.length === 0) return [];
    const defaultSectionId = sections[0]._id;
    const indicesBySection = new Map<string, number[]>(sections.map((s) => [s._id, []]));
    orderedQuestions.forEach((q, i) => {
      const raw = q?.section;
      const sid = (typeof raw === "string" ? raw : raw?._id) ?? defaultSectionId;
      const bucketId = indicesBySection.has(sid) ? sid : defaultSectionId;
      indicesBySection.get(bucketId)!.push(i);
    });
    return sections.map((s) => ({ section: s, indices: indicesBySection.get(s._id) ?? [] }));
  }, [sections, orderedQuestions]);

  const activeSectionIdx = sectionBuckets.findIndex((b) => b.indices.includes(index));
  const activeIndices = activeSectionIdx >= 0
    ? sectionBuckets[activeSectionIdx].indices
    : Array.from({ length: totalQuestions }, (_, k) => k);

  const gotoSection = (bucketIdx: number) => {
    const b = sectionBuckets[bucketIdx];
    if (!b || b.indices.length === 0) return;
    goto(b.indices[0]);
  };

  // Start (or resume) the attempt
  useEffect(() => {
    let cancelled = false;
    testAttemptService
      .startTest(testId)
      .then((res) => {
        if (cancelled) return;
        const attempt = unwrapItem<any>(res);
        if (!attempt) throw new Error("Could not start test");
        setAttemptId(attempt._id);
        setExpiresAt(attempt.expiresAt);
        setIndex(attempt.currentQuestionIndex ?? 0);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message ?? "Could not start this test");
        navigate({ to: "/dashboard/mock-tests" });
      })
      .finally(() => !cancelled && setStarting(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  // Load current question
  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    setLoadingQuestion(true);
    testAttemptService
      .getQuestionByIndex(attemptId, index)
      .then((res) => {
        if (cancelled) return;
        const data = unwrapItem<any>(res);
        if (!data) throw new Error("Could not load question");
        setQuestion(data.question);
        setTotalQuestions(data.totalQuestions);
        setSelected(data.selectedOption ?? null);
        if (data.selectedOption !== null && data.selectedOption !== undefined) {
          setAnswered((a) => new Set(a).add(index));
        }
        setExpiresAt(data.expiresAt);
        setVisited((v) => new Set(v).add(index));
      })
      .catch((err) => {
        if (err?.response?.status === 400) {
          // attempt already submitted (e.g. expired) — go straight to result
          navigate({ to: "/result/$attemptId", params: { attemptId } });
          return;
        }
        toast.error(err?.response?.data?.message ?? "Could not load question");
      })
      .finally(() => !cancelled && setLoadingQuestion(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, index]);

  // Timer — driven by expiresAt from the start-attempt response. A 400 from
  // any test-attempt call is treated as authoritative and wins over the local
  // clock (the server may finalize slightly before/after our countdown hits 0).
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTime(left);
      if (left === 0) submit();
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const choose = async (optionIdx: number) => {
    if (!attemptId || !question) return;
    setSelected(optionIdx);
    setSaving(true);
    try {
      await testAttemptService.saveAnswer({ attemptId, questionId: question._id, selectedOption: optionIdx });
      setAnswered((a) => new Set(a).add(index));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save answer");
    } finally {
      setSaving(false);
    }
  };

  // There's no API to un-save an answer (save-answer only accepts a real
  // option index) — this clears the local selection so the UI reflects
  // "no answer" right now, but if the user leaves without picking a new
  // option, the previously saved answer will reappear on return since the
  // server still has it on file. Best-effort until a real clear endpoint exists.
  const clearResponse = () => {
    setSelected(null);
    setAnswered((a) => {
      const n = new Set(a);
      n.delete(index);
      return n;
    });
  };

  const toggleMark = () => {
    setMarked((m) => {
      const n = new Set(m);
      n.has(index) ? n.delete(index) : n.add(index);
      return n;
    });
  };

  const goto = (i: number) => setIndex(Math.max(0, Math.min(totalQuestions - 1, i)));

  const submitReport = async () => {
    if (!question || !reportReason.trim()) return;
    setReporting(true);
    try {
      await reportService.reportQuestion({ questionId: question._id, reason: reportReason });
      toast.success("Thanks — we'll take a look at this question.");
      setReportOpen(false);
      setReportReason("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not submit report");
    } finally {
      setReporting(false);
    }
  };

  const submit = async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    try {
      await testAttemptService.submitTest(attemptId);
      // "Marked for review" only ever exists as local UI state — there's no
      // field for it anywhere in the backend (TestAttempt model or the
      // result response), so it's handed to the results page this one time
      // via sessionStorage. Only works right after this submit in the same
      // browser session; results loaded later/elsewhere show no review marks.
      try {
        sessionStorage.setItem(`marked-${attemptId}`, JSON.stringify([...marked]));
      } catch {
        // sessionStorage unavailable (e.g. private browsing) — non-critical
      }
      navigate({ to: "/result/$attemptId", params: { attemptId } });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not submit test");
      setSubmitting(false);
    }
  };

  if (starting) return <div className="p-8">Starting attempt…</div>;
  if (!attemptId) return <div className="p-8">Could not start this test.</div>;
  if (loadingQuestion && !question) return <div className="p-8">Loading question…</div>;
  if (!question) return <div className="p-8">No questions in this test.</div>;

  const mins = time !== null ? Math.floor(time / 60) : 0;
  const secs = time !== null ? time % 60 : 0;
  const answeredCount = answered.size;

  const cellStatus = (i: number) => {
    if (answered.has(i) && marked.has(i)) return "ans-mark";
    if (marked.has(i)) return "mark";
    if (answered.has(i)) return "ans";
    if (visited.has(i)) return "not-ans";
    return "not-vis";
  };

  // Tally directly off cellStatus (one bucket per question) rather than the
  // raw sets, so the legend counts never double-count a question that's both
  // answered and marked — they always add up to totalQuestions, matching the
  // grid 1:1.
  const statusCounts = { "not-vis": 0, "not-ans": 0, ans: 0, mark: 0, "ans-mark": 0 };
  for (let i = 0; i < totalQuestions; i++) statusCounts[cellStatus(i)]++;
  const cellClass: Record<string, string> = {
    ans: "bg-success text-white",
    "not-ans": "bg-orange-500 text-white",
    mark: "bg-purple-500 text-white",
    "ans-mark": "bg-purple-500 text-white ring-2 ring-success",
    "not-vis": "bg-muted text-foreground",
  };

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="h-14 bg-background border-b border-border flex items-center px-4 lg:px-6 gap-4">
        <Logo compact />
        <div className="ml-auto flex items-center gap-2">
          {/* No pause endpoint exists — the attempt keeps counting down
              server-side regardless, so this stays disabled rather than
              implying a pause that doesn't actually happen. */}
          <Button size="sm" variant="outline" disabled title="Pausing isn't supported yet — the timer keeps running server-side">
            <Pause className="h-4 w-4 mr-1.5" /> Pause Test
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/10 text-destructive font-display font-bold tabular-nums">
            <Clock className="h-4 w-4" />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            <span className="text-[10px] font-normal text-destructive/70 ml-1">Time Left</span>
          </div>
          <Button size="sm" onClick={() => setConfirmOpen(true)}>
            Submit Test
          </Button>
        </div>
      </header>

      {/* Test summary bar — title/stats come from the real Test doc */}
      <div className="bg-background border-b border-border px-4 lg:px-6 py-3 flex items-center flex-wrap gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-8 w-8 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
            <FileText className="h-4 w-4" />
          </span>
          <span className="font-display font-bold text-sm truncate">{test?.title ?? "Mock Test"}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground ml-auto flex-wrap">
          <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {test?.totalQuestions ?? totalQuestions} Questions</span>
          <span className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5" /> {test?.totalMarks ?? "—"} Marks</span>
          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {test?.duration ?? "—"} Minutes</span>
          {test?.negativeMarking && (
            <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> +{Number(test?.negativeMarksPerQuestion ?? 0).toFixed(2)} Negative</span>
          )}
        </div>
      </div>

      <div className={cn("grid gap-4 p-4 lg:p-6", sections.length > 0 ? "lg:grid-cols-[220px_1fr_320px]" : "lg:grid-cols-[1fr_320px]")}>
        {sections.length > 0 && (
          <Card className="p-4 h-fit lg:order-first">
            <h4 className="font-display font-bold text-sm mb-3">Sections</h4>
            <div className="space-y-1">
              {sectionBuckets.map((b, i) => {
                const count = b.indices.length;
                const ansInSection = b.indices.filter((a) => answered.has(a)).length;
                const active = i === activeSectionIdx;
                return (
                  <button
                    key={b.section._id ?? i}
                    onClick={() => gotoSection(i)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors",
                      active ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted",
                    )}
                  >
                    <span className="truncate">{b.section.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{ansInSection}/{count}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        )}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-display font-semibold text-sm truncate">
              {sections.length > 0 && activeSectionIdx >= 0 ? sectionBuckets[activeSectionIdx].section.name : `Question ${index + 1} of ${totalQuestions}`}
            </span>
            <div className="flex items-center gap-2 text-xs shrink-0">
              <button onClick={toggleMark} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                <Bookmark className={cn("h-4 w-4", marked.has(index) && "fill-primary text-primary")} />
                Mark for Review
              </button>
              <button onClick={() => setReportOpen(true)} className="flex items-center gap-1 text-muted-foreground hover:text-destructive">
                <Flag className="h-4 w-4" />
                Report Issue
              </button>
            </div>
          </div>
          <div className="font-semibold mb-3">Q.{index + 1} <span className="text-xs text-muted-foreground font-normal">({question.marks} marks{question.negativeMarks ? `, -${question.negativeMarks} negative` : ""})</span></div>
          <p className="text-[15px] leading-7 mb-6">{question.questionText}</p>
          <RadioGroup value={selected !== null ? String(selected) : ""} onValueChange={(v) => choose(Number(v))} className="space-y-2.5">
            {question.options.map((o, i) => {
              const checked = selected === i;
              return (
                <Label
                  key={i}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-border px-4 py-3 cursor-pointer hover:bg-muted/50",
                    checked && "border-primary bg-primary/5"
                  )}
                >
                  <RadioGroupItem value={String(i)} className="border-primary" />
                  <span className="font-medium w-6">{OPTION_LETTERS[i]}.</span>
                  <span>{o.text}</span>
                </Label>
              );
            })}
          </RadioGroup>
          <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
            <Button variant="outline" onClick={() => goto(index - 1)} disabled={index === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" />Previous
            </Button>
            <div className="flex items-center gap-3">
              {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
              <Button variant="outline" onClick={clearResponse} disabled={selected === null}>
                <RotateCcw className="h-4 w-4 mr-1.5" /> Clear Response
              </Button>
            </div>
            <Button onClick={() => goto(index + 1)} disabled={index === totalQuestions - 1}>
              Save & Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card>

        <Card className="p-4 h-fit">
          <h4 className="font-display font-bold text-sm mb-3 text-primary border-b-2 border-primary inline-block pb-1.5">
            Questions
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 text-[11px] mb-4">
            <Legend color="bg-muted text-foreground" label="Not Visited" value={statusCounts["not-vis"]} />
            <Legend color="bg-orange-500" label="Not Answered" value={statusCounts["not-ans"]} />
            <Legend color="bg-success" label="Answered" value={statusCounts.ans} />
            <Legend color="bg-purple-500" label="Marked" value={statusCounts.mark} />
            <Legend color="bg-purple-500 ring-2 ring-success ring-offset-1" label="Answered & Marked" value={statusCounts["ans-mark"]} />
          </div>
          {sections.length > 0 && activeSectionIdx >= 0 && (
            <div className="text-xs font-semibold mb-2">{sectionBuckets[activeSectionIdx].section.name}</div>
          )}
          <div className="grid grid-cols-5 gap-2">
            {activeIndices.map((i) => (
              <button
                key={i}
                onClick={() => goto(i)}
                className={cn(
                  "h-9 rounded-md text-sm font-semibold",
                  cellClass[cellStatus(i)],
                  i === index && "ring-2 ring-primary ring-offset-1"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {sections.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="font-display font-bold text-sm mb-3">Quick Navigation</h4>
              <div className="grid grid-cols-[1fr_60px_50px] gap-2 text-[10px] text-muted-foreground font-semibold uppercase mb-1.5">
                <span>Section</span>
                <span>Progress</span>
                {/* Only the overall attempt has a server-enforced expiry — this
                    per-section value is the section's configured duration
                    shown as a static initial allotment, not a live countdown.
                    Confirm with backend before treating it as authoritative. */}
                <span className="text-right" title="Initial allotment from the section's duration field — not a live per-section timer">Time</span>
              </div>
              <div className="space-y-2">
                {sectionBuckets.map((b, i) => {
                  const count = b.indices.length;
                  const ansInSection = b.indices.filter((a) => answered.has(a)).length;
                  const pct = count ? Math.round((ansInSection / count) * 100) : 0;
                  return (
                    <button key={b.section._id ?? i} onClick={() => gotoSection(i)} className="w-full grid grid-cols-[1fr_60px_50px] gap-2 items-center text-left">
                      <span className="text-xs truncate">{b.section.name}</span>
                      <span className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <span className="block h-full bg-primary" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="text-[11px] text-muted-foreground text-right">{b.section.duration}:00</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button className="w-full mt-4" variant="outline" onClick={() => setConfirmOpen(true)}>
            Submit Test
          </Button>
        </Card>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Submit Test?
            </DialogTitle>
            <DialogDescription>
              You have answered {answeredCount} of {totalQuestions} questions. Once submitted you cannot change your answers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Continue Test
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
            <DialogDescription>What's wrong with this question? (e.g. wrong answer, typo, unclear wording)</DialogDescription>
          </DialogHeader>
          <Textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Describe the issue…" rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button onClick={submitReport} disabled={reporting || !reportReason.trim()}>
              {reporting ? "Submitting…" : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-block h-5 w-5 rounded grid place-items-center text-white text-[10px] font-bold",
          color,
        )}
      >
        {value}
      </span>
      <span className="text-muted-foreground leading-tight">{label}</span>
    </div>
  );
}
