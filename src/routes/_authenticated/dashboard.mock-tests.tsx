import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardList, Bookmark, FileText, BookOpenCheck, TrendingUp, Database, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/mock-tests")({
  component: MockTests,
});

const TABS = [
  { value: "all", label: "All Tests" },
  { value: "full_length", label: "Full Length Tests" },
  { value: "sectional", label: "Sectional Tests" },
  { value: "topic", label: "Topic Tests" },
  { value: "mixed", label: "Mixed Tests" },
  { value: "free", label: "Free Tests" },
];

const PAGE_SIZE = 6;

const ICONS = [
  { bg: "bg-primary/10", fg: "text-primary", icon: FileText },
  { bg: "bg-warning/10", fg: "text-warning", icon: BookOpenCheck },
  { bg: "bg-success/10", fg: "text-success", icon: ClipboardList },
  { bg: "bg-info/10", fg: "text-info", icon: TrendingUp },
  { bg: "bg-purple-100", fg: "text-purple-600", icon: Database },
];

const DIFF_STYLES: Record<string, string> = {
  easy: "bg-success/15 text-success-foreground border-success/30",
  medium: "bg-warning/15 text-warning-foreground border-warning/30",
  hard: "bg-destructive/15 text-destructive border-destructive/30",
};

function MockTests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("all");
  const [exam, setExam] = useState("all");
  const [type, setType] = useState("all");
  const [diff, setDiff] = useState("all");
  const [duration, setDuration] = useState("all");
  const [page, setPage] = useState(1);

  const { data: exams = [] } = useQuery({
    queryKey: ["mt-exams"],
    queryFn: async () => (await supabase.from("exams").select("id, slug, short_name, name")).data ?? [],
  });

  const { data: tests = [] } = useQuery({
    queryKey: ["all-mock-tests"],
    queryFn: async () =>
      (await supabase.from("mock_tests").select("*, exams(id, name, short_name, slug)").order("created_at")).data ?? [],
  });

  const { data: bookmarks = [] } = useQuery({
    queryKey: ["mt-bookmarks", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase.from("bookmarks").select("item_id").eq("user_id", user!.id).eq("item_type", "mock_test")).data ?? [],
  });
  const bookmarked = new Set(bookmarks.map((b) => b.item_id));

  const filtered = tests.filter((t) => {
    if (tab === "free" && !t.is_free) return false;
    if (tab !== "all" && tab !== "free" && t.test_type !== tab) return false;
    if (exam !== "all" && t.exams?.slug !== exam) return false;
    if (type !== "all" && t.test_type !== type) return false;
    if (diff !== "all" && t.difficulty !== diff) return false;
    if (duration === "short" && (t.duration_minutes ?? 0) > 60) return false;
    if (duration === "medium" && ((t.duration_minutes ?? 0) <= 60 || (t.duration_minutes ?? 0) > 120)) return false;
    if (duration === "long" && (t.duration_minutes ?? 0) <= 120) return false;
    return true;
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const start = async (testId: string) => {
    const { data, error } = await supabase.from("attempts").insert({ user_id: user!.id, test_id: testId, total_marks: 0 }).select("id").single();
    if (error || !data) return toast.error("Could not start test");
    navigate({ to: "/test/$testId", params: { testId } });
  };

  const toggleBookmark = async (testId: string) => {
    if (!user) return;
    if (bookmarked.has(testId)) {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("item_id", testId).eq("item_type", "mock_test");
    } else {
      await supabase.from("bookmarks").insert({ user_id: user.id, item_id: testId, item_type: "mock_test" });
    }
    qc.invalidateQueries({ queryKey: ["mt-bookmarks", user.id] });
  };

  const totalAttempts = tests.reduce((s, t) => s + (t.attempt_count ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold flex items-center gap-2">Mock Tests <ClipboardList className="h-5 w-5 text-primary" /></h1>
          <p className="text-sm text-muted-foreground">Take mock tests to evaluate your preparation and improve your performance.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={ClipboardList} value={`${tests.length}+`} label="Mock Tests Available" tone="primary" />
          <Stat icon={Database} value="25,000+" label="Questions Available" tone="success" />
          <Stat icon={FileText} value={`${(totalAttempts / 1000).toFixed(1)}K+`} label="Tests Attempted" tone="purple" />
          <Stat icon={TrendingUp} value="72.4%" label="Average Score" tone="warning" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
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
        <div className="grid md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Select Exam</label>
            <Select value={exam} onValueChange={setExam}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {exams.map((e) => <SelectItem key={e.id} value={e.slug}>{e.short_name ?? e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Test Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full_length">Full Length</SelectItem>
                <SelectItem value="sectional">Sectional</SelectItem>
                <SelectItem value="topic">Topic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Difficulty Level</label>
            <Select value={diff} onValueChange={setDiff}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Duration</label>
            <Select value={duration} onValueChange={setDuration}>
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
            <Button variant="outline" className="w-full bg-primary/5 border-primary/30 text-primary" onClick={() => { setExam("all"); setType("all"); setDiff("all"); setDuration("all"); }}>
              <RefreshCw className="h-4 w-4 mr-1" /> Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold">All Mock Tests ({filtered.length})</h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Sort by:</span>
            <Select defaultValue="latest"><SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="latest">Latest</SelectItem><SelectItem value="popular">Popular</SelectItem></SelectContent></Select>
          </div>
        </div>

        <div className="hidden lg:grid grid-cols-[1fr_90px_70px_80px_90px_80px_140px] gap-3 px-5 py-2.5 text-xs font-medium text-muted-foreground border-b border-border bg-muted/30">
          <div>Test Name</div>
          <div className="text-center">Questions</div>
          <div className="text-center">Marks</div>
          <div className="text-center">Duration</div>
          <div className="text-center">Difficulty</div>
          <div className="text-center">Attempts</div>
          <div className="text-center">Action</div>
        </div>

        <div className="divide-y divide-border">
          {pageItems.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">No tests match your filters.</div>
          )}
          {pageItems.map((t, i) => {
            const icon = ICONS[i % ICONS.length];
            const Icon = icon.icon;
            return (
              <div key={t.id} className="grid lg:grid-cols-[1fr_90px_70px_80px_90px_80px_140px] gap-3 px-5 py-4 items-center hover:bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn("h-10 w-10 rounded-lg grid place-items-center shrink-0", icon.bg)}>
                    <Icon className={cn("h-5 w-5", icon.fg)} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-sm truncate">{t.title}</div>
                      <Badge variant="outline" className="text-[10px] capitalize bg-primary/5 border-primary/30 text-primary">
                        {t.test_type.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{t.description ?? `Based on ${t.exams?.short_name ?? "exam"} pattern`}</div>
                  </div>
                </div>
                <div className="text-center"><div className="font-semibold text-sm">{t.total_questions}</div><div className="text-[10px] text-muted-foreground">Questions</div></div>
                <div className="text-center"><div className="font-semibold text-sm">{t.total_marks}</div><div className="text-[10px] text-muted-foreground">Marks</div></div>
                <div className="text-center"><div className="font-semibold text-sm">{t.duration_minutes}</div><div className="text-[10px] text-muted-foreground">Mins</div></div>
                <div className="text-center">
                  <Badge variant="outline" className={cn("capitalize text-[11px]", DIFF_STYLES[t.difficulty ?? "medium"])}>{t.difficulty ?? "medium"}</Badge>
                </div>
                <div className="text-center text-sm font-medium">{((t.attempt_count ?? 0) / 1000).toFixed(1)}K</div>
                <div className="flex items-center gap-2 justify-center">
                  <Button size="sm" onClick={() => start(t.id)}>Start Test</Button>
                  <button onClick={() => toggleBookmark(t.id)} aria-label="Bookmark" className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted">
                    <Bookmark className={cn("h-4 w-4", bookmarked.has(t.id) ? "fill-primary text-primary" : "text-muted-foreground")} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

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
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, value, label, tone }: { icon: any; value: string; label: string; tone: string }) {
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
