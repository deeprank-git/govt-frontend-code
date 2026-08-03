import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, FileText, Award, AlertTriangle, ListChecks, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/site/Logo";
import * as testService from "@/services/testService";
import * as testAttemptService from "@/services/testAttemptService";
import { unwrapItem } from "@/lib/api-unwrap";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/test/$testId_/instructions")({
  component: TestInstructionsPage,
});

const GENERAL_INSTRUCTIONS = [
  "The test contains multiple sections, each with its own set of questions — you can switch between sections anytime from the sidebar.",
  "Each question has multiple options; select the one you believe is correct.",
  "Use \"Save & Next\" to save your response and move to the next question.",
  "Use \"Clear Response\" to deselect your chosen answer for the current question.",
  "Use \"Mark for Review\" to flag a question you want to revisit before submitting.",
  "The timer at the top counts down for the entire test — it submits automatically when it reaches zero.",
  "Once you click \"Submit Test\", your answers are final and cannot be changed.",
];

function TestInstructionsPage() {
  const { testId } = Route.useParams();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);

  const { data: testRes, isLoading } = useQuery({
    queryKey: ["test-detail", testId],
    queryFn: () => testService.getTestById(testId),
  });
  const test = unwrapItem<any>(testRes);
  const sections: any[] = test?.sections ?? [];

  const startTest = async () => {
    setStarting(true);
    try {
      await testAttemptService.startTest(testId);
      navigate({ to: "/test/$testId", params: { testId } });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not start this test");
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="h-14 bg-background border-b border-border flex items-center px-4 lg:px-6 gap-4">
        <Logo size="h-7" />
        <Button variant="ghost" size="sm" asChild className="ml-auto">
          <Link to="/dashboard/mock-tests"><ArrowLeft className="h-4 w-4 mr-1" />Back to Mock Tests</Link>
        </Button>
      </header>

      <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-5">
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-10 text-center">Loading test details…</div>
        ) : !test ? (
          <div className="text-sm text-muted-foreground py-10 text-center">Could not load this test.</div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-display font-extrabold">{test.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">Read the instructions carefully before you begin.</p>
            </div>

            <Card className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Fact icon={FileText} label="Questions" value={test.totalQuestions ?? 0} />
              <Fact icon={Award} label="Total Marks" value={test.totalMarks ?? 0} />
              <Fact icon={Clock} label="Duration" value={`${test.duration ?? 0} Min`} />
              <Fact
                icon={AlertTriangle}
                label="Negative Marking"
                value={test.negativeMarking ? `-${Number(test.negativeMarksPerQuestion ?? 0).toFixed(2)}` : "None"}
              />
            </Card>

            {sections.length > 0 && (
              <Card className="p-5">
                <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" /> Sections
                </h2>
                <div className="hidden sm:grid grid-cols-[1fr_100px_100px_100px] gap-3 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                  <div>Section</div>
                  <div className="text-center">Questions</div>
                  <div className="text-center">Marks</div>
                  <div className="text-center">Duration</div>
                </div>
                <div className="divide-y divide-border">
                  {sections.map((s) => (
                    <div key={s._id ?? s.name} className="grid sm:grid-cols-[1fr_100px_100px_100px] gap-1 sm:gap-3 px-3 py-2.5 text-sm">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-muted-foreground sm:text-center">{s.no_of_questions} Questions</div>
                      <div className="text-muted-foreground sm:text-center">{s.no_of_marks} Marks</div>
                      <div className="text-muted-foreground sm:text-center">{s.duration} Min</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-5">
              <h2 className="font-display font-bold text-base mb-3">General Instructions</h2>
              <ul className="space-y-2.5">
                {GENERAL_INSTRUCTIONS.map((line, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} className="mt-0.5" />
                <span className="text-sm">I have read and understood the instructions. I agree to attempt the test within the allotted time.</span>
              </label>
              <Button className="w-full mt-4" size="lg" disabled={!agreed || starting} onClick={startTest}>
                {starting ? "Starting…" : "Start Test"}
              </Button>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}
