import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Users, Eye, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard/rank")({
  component: RankPage,
});

const SECTIONS = [
  { name: "General Intelligence & Reasoning", pct: 92.18, rank: 14256, color: "hsl(var(--primary))" },
  { name: "Quantitative Aptitude", pct: 94.31, rank: 10482, color: "hsl(217 91% 60%)" },
  { name: "English Language", pct: 91.27, rank: 16753, color: "hsl(280 65% 55%)" },
  { name: "General Awareness", pct: 93.88, rank: 12019, color: "hsl(142 71% 45%)" },
];

const COMPARISON = [
  { label: "Topper", value: 198, color: "hsl(142 71% 45%)" },
  { label: "Top 1%", value: 189, color: "hsl(217 91% 60%)" },
  { label: "Top 10%", value: 167, color: "hsl(280 65% 55%)" },
  { label: "You", value: 128, color: "hsl(var(--primary))" },
  { label: "Average", value: 115, color: "hsl(38 92% 50%)" },
];

function RankPage() {
  const { user } = useAuth();

  const { data: attempts = [] } = useQuery({
    queryKey: ["rank-attempts", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase
        .from("attempts")
        .select("id, score, total_marks, percentile, rank, submitted_at, mock_tests(title)")
        .eq("user_id", user!.id)
        .eq("status", "completed")
        .order("submitted_at", { ascending: false })
        .limit(10)).data ?? [],
  });

  const trend = attempts.slice().reverse().map((a, i) => ({
    label: a.submitted_at ? new Date(a.submitted_at).toLocaleDateString(undefined, { day: "2-digit", month: "short" }) : `T${i + 1}`,
    rank: a.rank ?? 12000 + Math.round(Math.random() * 5000),
  }));
  if (trend.length === 0) {
    ["10 May", "12 May", "14 May", "16 May", "20 May", "22 May", "24 May"].forEach((label, i) =>
      trend.push({ label, rank: [18732, 16298, 14982, 15871, 14103, 13256, 12846][i] })
    );
  }

  const latest = attempts[0];
  const myRank = latest?.rank ?? 12846;
  const myPercentile = latest?.percentile ? Number(latest.percentile).toFixed(2) : "93.42";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold flex items-center gap-2">
            All India Rank <Trophy className="h-5 w-5 text-warning" />
          </h1>
          <p className="text-sm text-muted-foreground">See how you stand among all the aspirants who have attempted the test.</p>
        </div>
        <Card className="px-5 py-3 flex items-center gap-3 bg-success/5 border-success/30">
          <Users className="h-7 w-7 text-success" />
          <div>
            <div className="text-xl font-display font-bold leading-none">1,24,856</div>
            <div className="text-xs text-muted-foreground">Total Aspirants · Who attempted this test</div>
          </div>
        </Card>
      </div>

      <Card className="p-4 grid md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Select Exam</label>
          <Select defaultValue="ssc-cgl">
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ssc-cgl">SSC CGL</SelectItem></SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Select Test</label>
          <Select defaultValue="t1">
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="t1">SSC CGL Full Length Mock Test 05</SelectItem></SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Attempt Date</label>
          <Select defaultValue="d1">
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="d1">24 May 2024</SelectItem></SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="bg-primary/5 border-primary/30 text-primary">
          <Eye className="h-4 w-4 mr-1" /> View Another Test
        </Button>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <div className="text-xs text-muted-foreground">Your All India Rank</div>
          <div className="text-5xl font-display font-extrabold mt-1">{myRank.toLocaleString("en-IN")}</div>
          <Badge className="bg-success/15 text-success-foreground border-transparent mt-2">Percentile {myPercentile}%</Badge>
          <div className="mt-4 rounded-lg bg-success/10 p-3 text-sm">
            <span className="font-semibold text-success-foreground">Great Job!</span>{" "}
            <span className="text-muted-foreground">You are in the top 6.58% of aspirants. Keep practising to improve your rank.</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Your Rank Trend</h3>
            <Select defaultValue="all"><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Tests</SelectItem></SelectContent></Select>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis reversed stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={55} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Line type="monotone" dataKey="rank" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-success-foreground mt-2">↗ Your rank is improving consistently. Keep it up!</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="font-display font-bold mb-4">Sectional Rank</h3>
          <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={SECTIONS} dataKey="pct" innerRadius={36} outerRadius={60} paddingAngle={2}>
                    {SECTIONS.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="-mt-24 text-center pointer-events-none">
                <div className="text-[10px] text-muted-foreground">Overall Percentile</div>
                <div className="font-display font-bold">93.42%</div>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              {SECTIONS.map((s) => (
                <div key={s.name} className="grid grid-cols-[12px_1fr_auto_auto] gap-2 items-center">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="truncate font-medium text-foreground">{s.name}</span>
                  <span className="text-muted-foreground">Percentile <b className="text-foreground">{s.pct}%</b></span>
                  <span className="text-muted-foreground">Rank <b className="text-foreground">{s.rank.toLocaleString("en-IN")}</b></span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold mb-1">Rank Comparison</h3>
          <p className="text-xs text-muted-foreground mb-3">See how you compare to other aspirants.</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={COMPARISON} layout="vertical" margin={{ left: 16, right: 32 }}>
                <XAxis type="number" hide domain={[0, 200]} />
                <YAxis dataKey="label" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={70} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {COMPARISON.map((c) => <Cell key={c.label} fill={c.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-display font-bold mb-3">Your Recent Test Rankings</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Test Name</TableHead>
              <TableHead>Attempt Date</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Percentile</TableHead>
              <TableHead className="text-right">All India Rank</TableHead>
              <TableHead className="text-right">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attempts.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">No completed attempts yet.</TableCell></TableRow>
            )}
            {attempts.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.mock_tests?.title ?? "Mock Test"}</TableCell>
                <TableCell>{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="text-right">{Number(a.score ?? 0)} / {Number(a.total_marks ?? 0)}</TableCell>
                <TableCell className="text-right text-success-foreground font-semibold">{a.percentile ? Number(a.percentile).toFixed(2) : "—"}%</TableCell>
                <TableCell className="text-right font-semibold">{a.rank?.toLocaleString("en-IN") ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" asChild>
                    <Link to="/result/$attemptId" params={{ attemptId: a.id }}><Eye className="h-4 w-4 text-primary" /></Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
