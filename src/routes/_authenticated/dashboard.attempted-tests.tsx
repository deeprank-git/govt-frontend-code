import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, CheckCircle2, Clock3, ChevronLeft, ChevronRight } from "lucide-react";
import * as testAttemptService from "@/services/testAttemptService";
import { unwrapList } from "@/lib/api-unwrap";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard/attempted-tests")({
  component: AttemptedTests,
});

// NOTE: GET /test-attempts/my-attempts is documented as a lightweight list
// (test name, score, status, dates) — it doesn't include the per-attempt
// percentile/accuracy/difficulty/exam breakdown the original Supabase-backed
// page showed, so those stat cards, filters, and the pie chart were dropped
// here rather than fabricated. They can come back once/if the backend adds
// that data to this endpoint.

type AttemptLite = {
  _id?: string;
  id?: string;
  test?: { id?: string; _id?: string; title?: string };
  testId?: string;
  testTitle?: string;
  score?: number;
  status?: string;
  startedAt?: string;
  completedAt?: string;
};

function AttemptedTests() {
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const { data: attempts = [] } = useQuery({
    queryKey: ["my-attempts"],
    queryFn: async () => unwrapList<AttemptLite>(await testAttemptService.getMyAttempts()),
  });

  const completed = attempts.filter((a) => (a.status ?? "").toLowerCase() === "completed");
  const inProgress = attempts.filter((a) => (a.status ?? "").toLowerCase() !== "completed");

  const sorted = useMemo(
    () =>
      [...attempts].sort(
        (a, b) =>
          +new Date(b.completedAt ?? b.startedAt ?? 0) -
          +new Date(a.completedAt ?? a.startedAt ?? 0),
      ),
    [attempts],
  );

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageItems = sorted.slice((page - 1) * pageSize, page * pageSize);

  const stats = [
    {
      label: "Total Tests",
      value: attempts.length,
      icon: ClipboardList,
      tint: "from-blue-500/10 to-blue-500/5",
      iconClr: "text-blue-600",
    },
    {
      label: "Completed",
      value: completed.length,
      icon: CheckCircle2,
      tint: "from-emerald-500/10 to-emerald-500/5",
      iconClr: "text-emerald-600",
    },
    {
      label: "In Progress",
      value: inProgress.length,
      icon: Clock3,
      tint: "from-amber-500/10 to-amber-500/5",
      iconClr: "text-amber-600",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-extrabold">Attended Tests</h1>
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Review all the tests you have attempted.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 xl:flex-1 xl:max-w-xl">
          {stats.map((s) => (
            <Card key={s.label} className="p-3 flex items-center gap-3 shadow-sm">
              <div
                className={cn(
                  "h-11 w-11 rounded-xl bg-gradient-to-br grid place-items-center",
                  s.tint,
                )}
              >
                <s.icon className={cn("h-5 w-5", s.iconClr)} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
                <div className="font-display font-extrabold text-lg leading-tight">{s.value}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/30">
          <div className="col-span-5">Test</div>
          <div className="col-span-2">Score</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        <div className="divide-y divide-border">
          {pageItems.map((a: AttemptLite) => {
            const id = (a._id ?? a.id)!;
            const status = (a.status ?? "in-progress").toLowerCase();
            const isCompleted = status === "completed";
            const testTitle = a.test?.title ?? a.testTitle ?? "Test";
            const testId = (a.test?.id ?? a.test?._id ?? a.testId)!;
            const date = a.completedAt ?? a.startedAt;
            return (
              <div key={id} className="grid grid-cols-12 gap-3 items-center px-4 py-3 text-sm">
                <div className="col-span-5 font-semibold truncate">{testTitle}</div>
                <div className="col-span-2">{a.score != null ? a.score : "—"}</div>
                <div className="col-span-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize text-[11px]",
                      isCompleted
                        ? "border-success/40 text-success-foreground bg-success/10"
                        : "border-warning/40 text-warning-foreground bg-warning/10",
                    )}
                  >
                    {status.replace("-", " ")}
                  </Badge>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {date ? format(new Date(date), "dd MMM yyyy") : "—"}
                </div>
                <div className="col-span-1 flex justify-end">
                  {isCompleted ? (
                    <Button size="sm" variant="ghost" className="text-primary h-8 px-2" asChild>
                      <Link to="/result/$attemptId" params={{ attemptId: id }}>
                        View
                      </Link>
                    </Button>
                  ) : (
                    <Button size="sm" className="h-8 px-2" asChild>
                      <Link to="/test/$testId" params={{ testId }}>
                        Resume
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-16">
              You haven't attempted any tests yet.
            </div>
          )}
        </div>

        {sorted.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
            <div>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, sorted.length)} of{" "}
              {sorted.length} tests
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {Array.from({ length: Math.min(pageCount, 5) }).map((_, i) => {
                const n = i + 1;
                return (
                  <Button
                    key={n}
                    size="icon"
                    variant={page === n ? "default" : "outline"}
                    className="h-7 w-7 text-xs"
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </Button>
                );
              })}
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                disabled={page === pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
