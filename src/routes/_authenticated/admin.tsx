import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, Users, ClipboardList, FileText, Newspaper, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { user } = context as { user: { role?: string } };
    if (user.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminPanel,
});

function AdminPanel() {
  const { data: exams = [] } = useQuery({
    queryKey: ["adm-exams"],
    queryFn: async () => (await supabase.from("exams").select("*").order("name")).data ?? [],
  });
  const { data: tests = [] } = useQuery({
    queryKey: ["adm-tests"],
    queryFn: async () =>
      (await supabase.from("mock_tests").select("*").order("created_at")).data ?? [],
  });
  const { data: ca = [] } = useQuery({
    queryKey: ["adm-ca"],
    queryFn: async () =>
      (
        await supabase
          .from("current_affairs")
          .select("*")
          .order("published_at", { ascending: false })
      ).data ?? [],
  });
  const { data: users = [] } = useQuery({
    queryKey: ["adm-users"],
    queryFn: async () =>
      (
        await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50)
      ).data ?? [],
  });

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="h-14 bg-background border-b border-border flex items-center px-4 lg:px-6">
        <Shield className="h-5 w-5 text-primary mr-2" />
        <h1 className="font-display font-bold">Admin Panel</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </header>

      <div className="p-4 lg:p-6 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric icon={BookOpen} label="Exams" value={exams.length} />
          <Metric icon={ClipboardList} label="Mock Tests" value={tests.length} />
          <Metric icon={Newspaper} label="Current Affairs" value={ca.length} />
          <Metric icon={Users} label="Users" value={users.length} />
        </div>

        <Tabs defaultValue="exams">
          <TabsList>
            <TabsTrigger value="exams">Exams</TabsTrigger>
            <TabsTrigger value="tests">Mock Tests</TabsTrigger>
            <TabsTrigger value="ca">Current Affairs</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="exams" className="mt-4">
            <AdminTable
              cols={["Name", "Slug", "Body", "Level"]}
              rows={exams.map((e) => [e.name, e.slug, e.conducting_body, e.level])}
            />
          </TabsContent>
          <TabsContent value="tests" className="mt-4">
            <AdminTable
              cols={["Title", "Type", "Qs", "Marks", "Duration"]}
              rows={tests.map((t) => [
                t.title,
                t.test_type,
                t.total_questions,
                t.total_marks,
                `${t.duration_minutes} Min`,
              ])}
            />
          </TabsContent>
          <TabsContent value="ca" className="mt-4">
            <AdminTable
              cols={["Title", "Category", "Published"]}
              rows={ca.map((a) => [
                a.title,
                a.category,
                new Date(a.published_at).toLocaleDateString(),
              ])}
            />
          </TabsContent>
          <TabsContent value="users" className="mt-4">
            <AdminTable
              cols={["Name", "Email", "Mobile", "Joined"]}
              rows={users.map((u) => [
                u.full_name,
                u.email,
                u.mobile,
                new Date(u.created_at).toLocaleDateString(),
              ])}
            />
          </TabsContent>
        </Tabs>

        <Card className="p-4 text-xs text-muted-foreground">
          Note: write operations (create/edit/delete) are scoped to admins by RLS — wire admin forms
          here as needed.
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: any) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <span className="h-10 w-10 grid place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-display font-bold">{value}</div>
      </div>
    </Card>
  );
}

function AdminTable({ cols, rows }: { cols: string[]; rows: any[][] }) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map((c) => (
              <TableHead key={c}>{c}</TableHead>
            ))}
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {r.map((v, j) => (
                <TableCell key={j}>{String(v ?? "—")}</TableCell>
              ))}
              <TableCell className="text-right">
                <Badge variant="outline">Read-only</Badge>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={cols.length + 1}
                className="text-center text-sm text-muted-foreground py-8"
              >
                No rows.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
