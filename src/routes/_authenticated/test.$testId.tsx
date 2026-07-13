import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Clock, Pause, Flag, ChevronLeft, ChevronRight, Bookmark, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/site/Logo";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/test/$testId")({
  component: TestEngine,
});

type Q = {
  id: string;
  section: string;
  question_number: number;
  question_text: string;
  options: { key: string; text: string }[];
  marks: number;
  negative_marks: number;
};

function TestEngine() {
  const { testId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: test } = useQuery({
    queryKey: ["test", testId],
    queryFn: async () => (await supabase.from("mock_tests").select("*").eq("id", testId).maybeSingle()).data,
  });

  const { data: rawQs = [] } = useQuery({
    queryKey: ["test-qs", testId],
    queryFn: async () =>
      (await (supabase.from as any)("questions_public").select("*").eq("test_id", testId).order("question_number")).data ?? [],
  });
  const questions = rawQs as unknown as Q[];

  const { data: attemptRow } = useQuery({
    queryKey: ["active-attempt", testId, user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase
        .from("attempts")
        .select("*")
        .eq("user_id", user!.id)
        .eq("test_id", testId)
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle()).data,
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Hydrate attempt state
  useEffect(() => {
    if (attemptRow) {
      setAnswers((attemptRow.answers as Record<string, string>) ?? {});
      setMarked(new Set(((attemptRow.marked_for_review as string[]) ?? [])));
      setVisited(new Set(((attemptRow.visited as string[]) ?? [])));
    }
  }, [attemptRow?.id]);

  // Timer
  useEffect(() => {
    if (!test || !attemptRow) return;
    const start = new Date(attemptRow.started_at).getTime();
    const total = (test.duration_minutes ?? 60) * 60;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(0, total - elapsed);
      setTime(left);
      if (left === 0) submit();
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, attemptRow]);

  const sections = useMemo(() => Array.from(new Set(questions.map((q) => q.section))), [questions]);
  useEffect(() => {
    if (!activeSection && sections.length) setActiveSection(sections[0]);
  }, [sections, activeSection]);

  const sectionQs = useMemo(
    () => questions.filter((q) => q.section === activeSection),
    [questions, activeSection]
  );
  const active = sectionQs[activeIdx];

  useEffect(() => {
    if (active) setVisited((v) => new Set(v).add(active.id));
  }, [active?.id]);

  // Autosave
  useEffect(() => {
    if (!attemptRow) return;
    const t = setTimeout(() => {
      supabase
        .from("attempts")
        .update({
          answers,
          marked_for_review: Array.from(marked),
          visited: Array.from(visited),
        })
        .eq("id", attemptRow.id)
        .then(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [answers, marked, visited, attemptRow?.id]);

  const choose = (key: string) => {
    if (!active) return;
    setAnswers((a) => ({ ...a, [active.id]: key }));
  };
  const clear = () => active && setAnswers((a) => { const { [active.id]: _, ...rest } = a; return rest; });
  const toggleMark = () => {
    if (!active) return;
    setMarked((m) => { const n = new Set(m); n.has(active.id) ? n.delete(active.id) : n.add(active.id); return n; });
  };

  const goto = (i: number) => setActiveIdx(Math.max(0, Math.min(sectionQs.length - 1, i)));

  const submit = async () => {
    if (!attemptRow || submitting) return;
    setSubmitting(true);
    const timeTaken = test ? ((test.duration_minutes ?? 60) * 60) - (time ?? 0) : 0;

    await supabase
      .from("attempts")
      .update({
        answers,
        marked_for_review: Array.from(marked),
        visited: Array.from(visited),
      })
      .eq("id", attemptRow.id);

    const { error } = await (supabase.rpc as any)("submit_attempt", {
      _attempt_id: attemptRow.id,
      _answers: answers,
      _time_taken_seconds: timeTaken,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/result/$attemptId", params: { attemptId: attemptRow.id } });
  };

  if (!test) return <div className="p-8">Loading test…</div>;
  if (!attemptRow) return <div className="p-8">Starting attempt…</div>;
  if (questions.length === 0) return <div className="p-8">No questions in this test.</div>;

  const mins = time !== null ? Math.floor(time / 60) : 0;
  const secs = time !== null ? time % 60 : 0;
  const answeredCount = Object.keys(answers).length;
  const markedCount = marked.size;
  const notVisited = questions.length - visited.size;

  const cellStatus = (q: Q) => {
    if (answers[q.id] && marked.has(q.id)) return "ans-mark";
    if (marked.has(q.id)) return "mark";
    if (answers[q.id]) return "ans";
    if (visited.has(q.id)) return "not-ans";
    return "not-vis";
  };
  const cellClass: Record<string, string> = {
    "ans": "bg-success text-white",
    "not-ans": "bg-destructive text-white",
    "mark": "bg-purple-500 text-white",
    "ans-mark": "bg-purple-500 text-white ring-2 ring-success",
    "not-vis": "bg-muted text-foreground",
  };

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="h-14 bg-background border-b border-border flex items-center px-4 lg:px-6 gap-4">
        <Logo compact />
        <div className="hidden md:block font-semibold text-sm truncate">{test.title}</div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm"><Pause className="h-4 w-4 mr-1" />Pause</Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/10 text-destructive font-display font-bold tabular-nums">
            <Clock className="h-4 w-4" />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            <span className="text-[10px] font-normal text-destructive/70 ml-1">Time Left</span>
          </div>
          <Button size="sm" onClick={() => setConfirmOpen(true)}>Submit Test</Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[260px_1fr_320px] gap-4 p-4 lg:p-6">
        {/* Sections sidebar */}
        <Card className="p-4 h-fit">
          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
            <div><div className="font-display font-bold">{test.total_questions}</div><div className="text-muted-foreground">Questions</div></div>
            <div><div className="font-display font-bold">{test.total_marks}</div><div className="text-muted-foreground">Marks</div></div>
            <div><div className="font-display font-bold">+{test.negative_marking}</div><div className="text-muted-foreground">Negative</div></div>
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Sections</h4>
          <div className="space-y-1">
            {sections.map((s) => {
              const total = questions.filter((q) => q.section === s).length;
              const ans = questions.filter((q) => q.section === s && answers[q.id]).length;
              return (
                <button
                  key={s}
                  onClick={() => { setActiveSection(s); setActiveIdx(0); }}
                  className={cn(
                    "w-full text-left rounded-md px-3 py-2 text-sm flex items-center justify-between",
                    activeSection === s ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  )}
                >
                  <span className="truncate">{s}</span>
                  <span className="text-xs text-muted-foreground">{ans}/{total}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Question */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline">{activeSection}</Badge>
            <div className="flex items-center gap-2 text-xs">
              <button onClick={toggleMark} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                <Bookmark className={cn("h-4 w-4", active && marked.has(active.id) && "fill-primary text-primary")} />
                Mark for Review
              </button>
              <button className="flex items-center gap-1 text-muted-foreground hover:text-destructive"><Flag className="h-4 w-4" />Report</button>
            </div>
          </div>
          {active && (
            <>
              <div className="font-semibold mb-3">Q.{active.question_number}</div>
              <p className="text-[15px] leading-7 mb-6">{active.question_text}</p>
              <RadioGroup value={answers[active.id] ?? ""} onValueChange={choose} className="space-y-2.5">
                {active.options.map((o) => {
                  const checked = answers[active.id] === o.key;
                  return (
                    <Label
                      key={o.key}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border border-border px-4 py-3 cursor-pointer hover:bg-muted/50",
                        checked && "border-primary bg-primary/5"
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
                <Button variant="outline" onClick={() => goto(activeIdx - 1)} disabled={activeIdx === 0}>
                  <ChevronLeft className="h-4 w-4 mr-1" />Previous
                </Button>
                <Button variant="ghost" onClick={clear}>Clear Response</Button>
                <Button onClick={() => goto(activeIdx + 1)} disabled={activeIdx === sectionQs.length - 1}>
                  Save & Next <ChevronRight className="h-4 w-4 ml-1" />
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
            <Legend color="bg-destructive" label="Not Answered" value={questions.length - answeredCount - notVisited} />
            <Legend color="bg-success" label="Answered" value={answeredCount} />
            <Legend color="bg-purple-500" label="Marked" value={markedCount} />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {sectionQs.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setActiveIdx(i)}
                className={cn(
                  "h-9 rounded-md text-sm font-semibold",
                  cellClass[cellStatus(q)],
                  i === activeIdx && "ring-2 ring-primary ring-offset-1"
                )}
              >
                {q.question_number}
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
            <DialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-warning" />Submit Test?</DialogTitle>
            <DialogDescription>
              You have answered {answeredCount} of {questions.length} questions. Once submitted you cannot change your answers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Continue Test</Button>
            <Button onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit Now"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("inline-block h-5 w-5 rounded grid place-items-center text-white text-[10px] font-bold", color)}>{value}</span>
      <span className="text-muted-foreground leading-tight">{label}</span>
    </div>
  );
}
