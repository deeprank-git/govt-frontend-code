import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Clock, Bookmark, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import * as testService from "@/services/testService";
import * as questionService from "@/services/questionService";
import * as testAttemptService from "@/services/testAttemptService";
import { unwrapItem, unwrapList } from "@/lib/api-unwrap";
import type { ApiError } from "@/api/axiosClient";
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

type Q = {
  id: string;
  questionText: string;
  options: { key: string; text: string }[];
  marks?: number;
  negativeMarks?: number;
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

  const { data: testRaw } = useQuery({
    queryKey: ["test", testId],
    queryFn: async () => unwrapItem<TestLite>(await testService.getTestById(testId)),
  });
  const test = testRaw;

  const { data: questionsRaw = [] } = useQuery({
    queryKey: ["test-qs", testId],
    queryFn: async () => unwrapList(await questionService.getQuestions(testId)),
  });
  const questions = questionsRaw as unknown as Q[];

  // Starting an attempt is safe to call every time this page mounts: the
  // backend resumes an existing in-progress attempt instead of duplicating it.
  const { data: attemptRaw } = useQuery({
    queryKey: ["attempt-start", testId],
    queryFn: async () => unwrapItem<AttemptLite>(await testAttemptService.startAttempt(testId)),
    retry: false,
  });
  const attempt = attemptRaw;
  const attemptId: string | undefined = attempt?._id ?? attempt?.id;
  const expiresAt: string | undefined = attempt?.expiresAt;

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [activeIdx, setActiveIdx] = useState(0);
  const [time, setTime] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);

  const active = questions[activeIdx];

  // Fetches the active question through the attempt (not the plain question
  // list) because this is the endpoint that: (a) returns the student's
  // previously saved answer for pre-fill, and (b) runs the backend's lazy
  // expiry check on every touch — a 400 here means the attempt is over.
  const { data: attemptQuestionRaw, error: questionError } = useQuery({
    queryKey: ["attempt-question", attemptId, activeIdx],
    enabled: !!attemptId && !!active,
    queryFn: async () =>
      unwrapItem<AttemptQuestionLite>(
        await testAttemptService.getQuestionByIndex(attemptId!, activeIdx),
      ),
    retry: false,
  });

  useEffect(() => {
    const err = questionError as ApiError | null;
    if (err && err.status === 400) setExpired(true);
  }, [questionError]);

  useEffect(() => {
    const payload = attemptQuestionRaw;
    const prevAnswer = payload?.selectedOption ?? payload?.answer;
    if (active && prevAnswer) {
      setAnswers((a) => ({ ...a, [qid(active)]: prevAnswer }));
    }
  }, [attemptQuestionRaw, active]);

  useEffect(() => {
    if (active) setVisited((v) => new Set(v).add(qid(active)));
  }, [active]);

  const submit = async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    try {
      await testAttemptService.submitAttempt(attemptId);
      navigate({ to: "/result/$attemptId", params: { attemptId } });
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Timer — driven by expiresAt from the start-attempt response. A 400 from
  // any test-attempt call is treated as authoritative and wins over the local
  // clock (the server may finalize slightly before/after our countdown hits 0).
  useEffect(() => {
    if (!expiresAt) return;
    const end = new Date(expiresAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setTime(left);
      if (left === 0) setExpired(true);
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [expiresAt]);

  useEffect(() => {
    if (!expired || submitting) return;
    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  const choose = (key: string) => {
    if (!active || !attemptId) return;
    const questionId = qid(active);
    setAnswers((a) => ({ ...a, [questionId]: key }));
    testAttemptService
      .saveAnswer({ attemptId, questionId, selectedOption: key })
      .catch((err: ApiError) => toast.error(err.message));
  };

  // Note: the backend has no documented "unset answer" endpoint, so clearing
  // only affects local state — a previously saved answer will reappear if the
  // student revisits this question after a refresh.
  const clear = () =>
    active &&
    setAnswers((a) => {
      const { [qid(active)]: _, ...rest } = a;
      return rest;
    });
  const toggleMark = () => {
    if (!active) return;
    const id = qid(active);
    setMarked((m) => {
      const n = new Set(m);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const goto = (i: number) => setActiveIdx(Math.max(0, Math.min(questions.length - 1, i)));

  if (expired) return <div className="p-8">Time's up — submitting your test…</div>;
  if (!test) return <div className="p-8">Loading test…</div>;
  if (!attemptId) return <div className="p-8">Starting attempt…</div>;
  if (questions.length === 0) return <div className="p-8">No questions in this test.</div>;

  const mins = time !== null ? Math.floor(time / 60) : 0;
  const secs = time !== null ? time % 60 : 0;
  const answeredCount = Object.keys(answers).length;
  const markedCount = marked.size;
  const notVisited = questions.length - visited.size;

  const cellStatus = (q: Q) => {
    const id = qid(q);
    if (answers[id] && marked.has(id)) return "ans-mark";
    if (marked.has(id)) return "mark";
    if (answers[id]) return "ans";
    if (visited.has(id)) return "not-ans";
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
        <div className="hidden md:block font-semibold text-sm truncate">{test.title}</div>
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

      <div className="grid lg:grid-cols-[260px_1fr_320px] gap-4 p-4 lg:p-6">
        {/* Overview */}
        <Card className="p-4 h-fit">
          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
            <div>
              <div className="font-display font-bold">{totalQuestions}</div>
              <div className="text-muted-foreground">Questions</div>
            </div>
            <div>
              <div className="font-display font-bold">{totalMarks}</div>
              <div className="text-muted-foreground">Marks</div>
            </div>
            <div>
              <div className="font-display font-bold">{active?.negativeMarks ?? 0}</div>
              <div className="text-muted-foreground">Negative</div>
            </div>
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Progress
          </h4>
          <div className="text-sm text-muted-foreground">
            {answeredCount} of {questions.length} answered
          </div>
        </Card>

        {/* Question */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline">Question {activeIdx + 1}</Badge>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={toggleMark}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary"
              >
                <Bookmark
                  className={cn(
                    "h-4 w-4",
                    active && marked.has(qid(active)) && "fill-primary text-primary",
                  )}
                />
                Mark for Review
              </button>
            </div>
          </div>
          {active && (
            <>
              <div className="font-semibold mb-3">Q.{activeIdx + 1}</div>
              <p className="text-[15px] leading-7 mb-6">{active.questionText}</p>
              <RadioGroup
                value={answers[qid(active)] ?? ""}
                onValueChange={choose}
                className="space-y-2.5"
              >
                {active.options?.map((o) => {
                  const checked = answers[qid(active)] === o.key;
                  return (
                    <Label
                      key={o.key}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border border-border px-4 py-3 cursor-pointer hover:bg-muted/50",
                        checked && "border-primary bg-primary/5",
                      )}
                    >
                      <RadioGroupItem value={o.key} className="border-primary" />
                      <span className="font-medium w-6">{o.key}.</span>
                      <span>{o.text}</span>
                    </Label>
                  );
                })}
              </RadioGroup>
              <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => goto(activeIdx - 1)}
                  disabled={activeIdx === 0}
                >
                  Previous
                </Button>
                <Button variant="ghost" onClick={clear}>
                  Clear Response
                </Button>
                <Button
                  onClick={() => goto(activeIdx + 1)}
                  disabled={activeIdx === questions.length - 1}
                >
                  Save & Next
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Palette */}
        <Card className="p-4 h-fit">
          <h4 className="font-display font-bold text-sm mb-3">Question Palette</h4>
          <div className="grid grid-cols-4 gap-2 text-[11px] mb-4">
            <Legend color="bg-muted" label="Not Visited" value={notVisited} />
            <Legend
              color="bg-destructive"
              label="Not Answered"
              value={questions.length - answeredCount - notVisited}
            />
            <Legend color="bg-success" label="Answered" value={answeredCount} />
            <Legend color="bg-purple-500" label="Marked" value={markedCount} />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, i) => (
              <button
                key={qid(q)}
                onClick={() => setActiveIdx(i)}
                className={cn(
                  "h-9 rounded-md text-sm font-semibold",
                  cellClass[cellStatus(q)],
                  i === activeIdx && "ring-2 ring-primary ring-offset-1",
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
              You have answered {answeredCount} of {questions.length} questions. Once submitted you
              cannot change your answers.
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
