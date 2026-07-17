import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardList, FileText, BookOpenCheck, TrendingUp, Database, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as testService from "@/services/testService";
import * as categoryService from "@/services/categoryService";
import * as testAttemptService from "@/services/testAttemptService";
import { unwrapList } from "@/lib/api-unwrap";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/mock-tests")({
  component: MockTests,
});

const TABS = [
  { value: "all", label: "All Tests" },
  { value: "free", label: "Free Tests" },
  { value: "paid", label: "Paid Tests" },
];

const PAGE_SIZE = 6;

const ICONS = [
  { bg: "bg-primary/10", fg: "text-primary", icon: FileText },
  { bg: "bg-warning/10", fg: "text-warning", icon: BookOpenCheck },
  { bg: "bg-success/10", fg: "text-success", icon: ClipboardList },
  { bg: "bg-info/10", fg: "text-info", icon: TrendingUp },
  { bg: "bg-purple-100", fg: "text-purple-600", icon: Database },
];

function MockTests() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const [category, setCategory] = useState("all");
  const [duration, setDuration] = useState("all");
  const [page, setPage] = useState(1);
  const [starting, setStarting] = useState<string | null>(null);

  const { data: categoriesRes } = useQuery({
    queryKey: ["mt-categories"],
    queryFn: () => categoryService.getCategories(),
  });
  const categories = unwrapList<any>(categoriesRes);

  const { data: testsRes, isLoading } = useQuery({
    queryKey: ["all-mock-tests"],
    queryFn: () => testService.getTests(),
  });
  const tests = unwrapList<any>(testsRes);

  const filtered = tests.filter((t) => {
    if (tab === "free" && t.isPaid) return false;
    if (tab === "paid" && !t.isPaid) return false;
    if (category !== "all" && t.category !== category) return false;
    if (duration === "short" && (t.duration ?? 0) > 60) return false;
    if (duration === "medium" && ((t.duration ?? 0) <= 60 || (t.duration ?? 0) > 120)) return false;
    if (duration === "long" && (t.duration ?? 0) <= 120) return false;
    return true;
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const start = async (testId: string) => {
    setStarting(testId);
    try {
      await testAttemptService.startTest(testId);
      navigate({ to: "/test/$testId", params: { testId } });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not start test");
    } finally {
      setStarting(null);
    }
  };

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
          <Stat icon={Database} value={`${categories.length}`} label="Categories" tone="success" />
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          setPage(1);
        }}
      >
        <TabsList className="bg-transparent p-0 h-auto flex flex-wrap gap-1 justify-start border-b border-border w-full rounded-none">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="p-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Select Category</label>
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Duration</label>
            <Select value={duration} onValueChange={(v) => { setDuration(v); setPage(1); }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Durations</SelectItem>
                <SelectItem value="short">≤ 60 min</SelectItem>
                <SelectItem value="medium">60-120 min</SelectItem>
                <SelectItem value="long">≥ 120 min</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" className="w-full bg-primary/5 border-primary/30 text-primary" onClick={() => { setCategory("all"); setDuration("all"); }}>
              <RefreshCw className="h-4 w-4 mr-1" /> Reset Filters
            </Button>
          </div>
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
          {pageItems.map((t: any, i: number) => {
            const icon = ICONS[i % ICONS.length];
            const Icon = icon.icon;
            return (
              <div key={t._id} className="grid lg:grid-cols-[1fr_90px_70px_80px_140px] gap-3 px-5 py-4 items-center hover:bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cn("h-10 w-10 rounded-lg grid place-items-center shrink-0", icon.bg)}
                  >
                    <Icon className={cn("h-5 w-5", icon.fg)} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-sm truncate">{t.title}</div>
                      <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/30 text-primary">
                        {t.isPaid ? "Paid" : "Free"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{t.description ?? "Mock test"}</div>
                  </div>
                </div>
                <div className="text-center"><div className="font-semibold text-sm">{t.totalQuestions}</div><div className="text-[10px] text-muted-foreground">Questions</div></div>
                <div className="text-center"><div className="font-semibold text-sm">{t.totalMarks}</div><div className="text-[10px] text-muted-foreground">Marks</div></div>
                <div className="text-center"><div className="font-semibold text-sm">{t.duration}</div><div className="text-[10px] text-muted-foreground">Mins</div></div>
                <div className="flex items-center gap-2 justify-center">
                  <Button size="sm" onClick={() => start(t._id)} disabled={starting === t._id}>
                    {starting === t._id ? "Starting…" : "Start Test"}
                  </Button>
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
