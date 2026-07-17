import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy, Users, Medal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as testService from "@/services/testService";
import * as leaderboardService from "@/services/leaderboardService";
import { unwrapList, unwrapItem } from "@/lib/api-unwrap";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/rank")({
  component: RankPage,
});

function RankPage() {
  const { user } = useAuth();
  const [testId, setTestId] = useState<string>("");

  const { data: testsRes } = useQuery({
    queryKey: ["rank-tests"],
    queryFn: () => testService.getTests(),
  });
  const tests = unwrapList<any>(testsRes);
  const activeTestId = testId || tests[0]?._id || "";

  const { data: leaderboardRes, isLoading } = useQuery({
    queryKey: ["leaderboard", activeTestId],
    enabled: !!activeTestId,
    queryFn: () => leaderboardService.getLeaderboard(activeTestId, 50),
  });
  const rows = unwrapList<any>(leaderboardRes);
  const testInfo = unwrapItem<any>(leaderboardRes) as any;
  const count = leaderboardRes?.count ?? rows.length;

  const myRow = rows.find((r) => r.userId === user?.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold flex items-center gap-2">
            Leaderboard <Trophy className="h-5 w-5 text-warning" />
          </h1>
          <p className="text-sm text-muted-foreground">See how you stand among everyone who has completed this test.</p>
        </div>
        <Card className="px-5 py-3 flex items-center gap-3 bg-success/5 border-success/30">
          <Users className="h-7 w-7 text-success" />
          <div>
            <div className="text-xl font-display font-bold leading-none">{count}</div>
            <div className="text-xs text-muted-foreground">Ranked Aspirants</div>
          </div>
        </Card>
      </div>

      <Card className="p-4 grid md:grid-cols-2 gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Select Test</label>
          <Select value={activeTestId} onValueChange={setTestId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select a test" /></SelectTrigger>
            <SelectContent>
              {tests.map((t) => <SelectItem key={t._id} value={t._id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {myRow && (
        <Card className="p-6">
          <div className="text-xs text-muted-foreground">Your Rank on this Test</div>
          <div className="text-5xl font-display font-extrabold mt-1">#{myRow.rank}</div>
          <Badge className="bg-success/15 text-success-foreground border-transparent mt-2">
            Score {myRow.score} / {testInfo?.totalMarks ?? "—"}
          </Badge>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-display font-bold mb-3">Rankings — {testInfo?.title ?? "Test"}</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Correct</TableHead>
              <TableHead className="text-right">Wrong</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">Loading leaderboard…</TableCell></TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No completed attempts for this test yet.</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.attemptId} className={cn(r.userId === user?.id && "bg-primary/5")}>
                <TableCell className="font-semibold">
                  {r.rank <= 3 ? <Medal className="h-4 w-4 inline mr-1 text-warning" /> : null}
                  {r.rank}
                </TableCell>
                <TableCell>{r.name}{r.userId === user?.id && <Badge variant="outline" className="ml-2 text-[10px]">You</Badge>}</TableCell>
                <TableCell className="text-right font-semibold">{r.score}</TableCell>
                <TableCell className="text-right text-success-foreground">{r.correctCount}</TableCell>
                <TableCell className="text-right text-destructive">{r.wrongCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
