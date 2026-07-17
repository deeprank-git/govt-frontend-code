import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, ChevronLeft, ChevronRight, Bookmark, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import * as testAttemptService from "@/services/testAttemptService";
import { unwrapItem } from "@/lib/api-unwrap";
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

type TestLite = {
  title: string;
  totalQuestions?: number;
  totalMarks?: number;
};

type AttemptLite = {
  _id?: string;
  id?: string;
  expiresAt?: string;
};

type AttemptQuestionLite = {
  selectedOption?: string;
  answer?: string;
};

function qid(q: { _id?: string; id?: string } | undefined): string {
  return (q?._id ?? q?.id)!;
}

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
      if (left === 0) setExpired(true);
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

  const toggleMark = () => {
    setMarked((m) => {
      const n = new Set(m);
      n.has(index) ? n.delete(index) : n.add(index);
      return n;
    });
  };

  const goto = (i: number) => setIndex(Math.max(0, Math.min(totalQuestions - 1, i)));

  const submit = async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    try {
      await testAttemptService.submitTest(attemptId);
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
  const markedCount = marked.size;
  const notVisited = totalQuestions - visited.size;

  const cellStatus = (i: number) => {
    if (answered.has(i) && marked.has(i)) return "ans-mark";
    if (marked.has(i)) return "mark";
    if (answered.has(i)) return "ans";
    if (visited.has(i)) return "not-ans";
    return "not-vis";
  };
  const cellClass: Record<string, string> = {
    ans: "bg-success text-white",
    "not-ans": "bg-destructive text-white",
    mark: "bg-purple-500 text-white",
    "ans-mark": "bg-purple-500 text-white ring-2 ring-success",
    "not-vis": "bg-muted text-foreground",
  };

  const totalQuestions = test.totalQuestions ?? questions.length;
  const totalMarks = test.totalMarks ?? 0;

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="h-14 bg-background border-b border-border flex items-center px-4 lg:px-6 gap-4">
        <Logo compact />
        <div className="ml-auto flex items-center gap-2">
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

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 p-4 lg:p-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline">Question {index + 1} of {totalQuestions}</Badge>
            <div className="flex items-center gap-2 text-xs">
              <button onClick={toggleMark} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                <Bookmark className={cn("h-4 w-4", marked.has(index) && "fill-primary text-primary")} />
                Mark for Review
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
            {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
            <Button onClick={() => goto(index + 1)} disabled={index === totalQuestions - 1}>
              Save & Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card>

        <Card className="p-4 h-fit">
          <h4 className="font-display font-bold text-sm mb-3">Question Palette</h4>
          <div className="grid grid-cols-4 gap-2 text-[11px] mb-4">
            <Legend color="bg-muted" label="Not Visited" value={notVisited} />
            <Legend color="bg-destructive" label="Not Answered" value={totalQuestions - answeredCount - notVisited} />
            <Legend color="bg-success" label="Answered" value={answeredCount} />
            <Legend color="bg-purple-500" label="Marked" value={markedCount} />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: totalQuestions }).map((_, i) => (
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
