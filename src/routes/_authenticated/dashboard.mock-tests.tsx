import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardList, Database } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExamIcon } from "@/components/site/ExamIcon";
import * as testService from "@/services/testService";
import * as testSeriesService from "@/services/testSeriesService";
import * as mediaService from "@/services/mediaService";
import { unwrapList } from "@/lib/api-unwrap";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/mock-tests")({
  component: MockTests,
});

const PAGE_SIZE = 6;

function MockTests() {
  const navigate = useNavigate();
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data: seriesRes } = useQuery({
    queryKey: ["mt-series"],
    queryFn: () => testSeriesService.getTestSeries(),
  });
  const series = unwrapList<any>(seriesRes);
  const seriesById = new Map(series.map((s) => [s._id, s]));

  const { data: testsRes, isLoading } = useQuery({
    queryKey: ["all-mock-tests"],
    queryFn: () => testService.getTests(),
  });
  const tests = unwrapList<any>(testsRes);

  const filtered = tests.filter((t) => {
    if (seriesFilter !== "all") {
      const sId = t.testSeries?._id ?? t.testSeries;
      if (sId !== seriesFilter) return false;
    }
    return true;
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goToInstructions = (testId: string) => navigate({ to: "/test/$testId/instructions", params: { testId } });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold flex items-center gap-2">
            Mock Tests <ClipboardList className="h-5 w-5 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground">
            Take mock tests to evaluate your preparation and improve your performance.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
          <Stat icon={ClipboardList} value={`${tests.length}`} label="Mock Tests Available" tone="primary" />
          <Stat icon={Database} value={`${series.length}`} label="Exams" tone="success" />
        </div>
      </div>

      <Card className="p-4">
        <div className="max-w-xs">
          <label className="text-xs text-muted-foreground">Select Exam</label>
          <Select value={seriesFilter} onValueChange={(v) => { setSeriesFilter(v); setPage(1); }}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {series.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold">All Mock Tests ({filtered.length})</h2>
        </div>

        <div className="hidden lg:grid grid-cols-[1fr_90px_70px_80px_140px] gap-3 px-5 py-2.5 text-xs font-medium text-muted-foreground border-b border-border bg-muted/30">
          <div>Test Name</div>
          <div className="text-center">Questions</div>
          <div className="text-center">Marks</div>
          <div className="text-center">Duration</div>
          <div className="text-center">Action</div>
        </div>

        <div className="divide-y divide-border">
          {isLoading && <div className="px-5 py-10 text-center text-sm text-muted-foreground">Loading tests…</div>}
          {!isLoading && pageItems.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">No tests match your filters.</div>
          )}
          {pageItems.map((t: any) => {
            const seriesId = t.testSeries?._id ?? t.testSeries;
            const testSeries = seriesById.get(seriesId);
            const logoUrl = testSeries?.image ? mediaService.resolveMediaUrl(testSeries.image) : undefined;
            return (
              <div key={t._id} className="grid lg:grid-cols-[1fr_90px_70px_80px_140px] gap-3 px-5 py-4 items-center hover:bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <ExamIcon name={testSeries?.name ?? t.title} className="h-10 w-10 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.description ?? "Mock test"}</div>
                  </div>
                </div>
                <div className="text-center"><div className="font-semibold text-sm">{t.totalQuestions}</div><div className="text-[10px] text-muted-foreground">Questions</div></div>
                <div className="text-center"><div className="font-semibold text-sm">{t.totalMarks}</div><div className="text-[10px] text-muted-foreground">Marks</div></div>
                <div className="text-center"><div className="font-semibold text-sm">{t.duration}</div><div className="text-[10px] text-muted-foreground">Mins</div></div>
                <div className="flex items-center gap-2 justify-center">
                  <Button size="sm" onClick={() => goToInstructions(t._id)}>Start Test</Button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length > 0 && (
          <div className="px-5 py-4 border-t border-border flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} tests
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</Button>
              {Array.from({ length: Math.min(pages, 4) }).map((_, i) => (
                <Button key={i} size="sm" variant={page === i + 1 ? "default" : "outline"} onClick={() => setPage(i + 1)} className="w-8">{i + 1}</Button>
              ))}
              {pages > 4 && <>
                <span className="px-2 text-muted-foreground">…</span>
                <Button size="sm" variant={page === pages ? "default" : "outline"} onClick={() => setPage(pages)} className="w-8">{pages}</Button>
              </>}
              <Button size="sm" variant="outline" disabled={page === pages} onClick={() => setPage(page + 1)}>›</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: any;
  value: string;
  label: string;
  tone: string;
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    purple: "bg-purple-100 text-purple-600",
  };
  return (
    <Card className="px-3 py-2.5 flex items-center gap-2.5 min-w-[160px]">
      <span className={cn("h-9 w-9 rounded-lg grid place-items-center shrink-0", toneMap[tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="font-display font-bold leading-tight">{value}</div>
        <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
      </div>
    </Card>
  );
}
