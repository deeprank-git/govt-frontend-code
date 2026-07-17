import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getToken, getUser, clearAuth } from "@/lib/auth-store";
import { unwrapList } from "@/lib/api-unwrap";
import * as categoryService from "@/services/categoryService";
import * as testSeriesService from "@/services/testSeriesService";
import * as testService from "@/services/testService";
import * as questionService from "@/services/questionService";
import * as userService from "@/services/userService";

export const Route = createFileRoute("/admin-dashboard")({
  beforeLoad: () => {
    const token = getToken();
    const user = getUser();
    if (!token || user?.role !== "admin") {
      throw redirect({ to: "/admin-login" });
    }
  },
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const navigate = useNavigate();

  const { data: categoriesRes } = useQuery({ queryKey: ["ad-categories"], queryFn: () => categoryService.getCategories() });
  const { data: seriesRes } = useQuery({ queryKey: ["ad-series"], queryFn: () => testSeriesService.getTestSeries() });
  const { data: testsRes } = useQuery({ queryKey: ["ad-tests"], queryFn: () => testService.getTests() });
  const { data: usersRes } = useQuery({ queryKey: ["ad-users"], queryFn: () => userService.getAllUsers() });

  const categories = unwrapList<any>(categoriesRes);
  const series = unwrapList<any>(seriesRes);
  const tests = unwrapList<any>(testsRes);
  const users = unwrapList<any>(usersRes);

  const logOut = () => {
    clearAuth();
    navigate({ to: "/admin-login" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        <Button variant="outline" size="sm" onClick={logOut}>
          Log out
        </Button>
      </header>

      <div className="p-4 space-y-8 max-w-5xl mx-auto">
        <CategoriesSection categories={categories} />
        <TestSeriesSection series={series} categories={categories} />
        <TestsSection tests={tests} categories={categories} series={series} />
        <QuestionsSection tests={tests} />
        <UsersSection users={users} />
      </div>
    </div>
  );
}

function SectionHeader({ title, onCreate }: { title: string; onCreate: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <Button size="sm" onClick={onCreate}>
        New
      </Button>
    </div>
  );
}

// ---------------- Categories ----------------

function CategoriesSection({ categories }: { categories: any[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", image: "" });

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "", image: "" }); setOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ name: c.name ?? "", description: c.description ?? "", image: c.image ?? "" }); setOpen(true); };

  const saveMut = useMutation({
    mutationFn: () => (editing ? categoryService.updateCategory(editing._id, form) : categoryService.createCategory(form)),
    onSuccess: () => {
      toast.success(editing ? "Category updated" : "Category created");
      qc.invalidateQueries({ queryKey: ["ad-categories"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not save category"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["ad-categories"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete category"),
  });

  return (
    <section className="border border-border rounded-md p-4">
      <SectionHeader title="Categories" onCreate={openCreate} />
      <Table>
        <TableHeader>
          <TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((c) => (
            <TableRow key={c._id}>
              <TableCell>{c.name}</TableCell>
              <TableCell>{c.slug}</TableCell>
              <TableCell className="max-w-xs truncate">{c.description || "—"}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => deleteMut.mutate(c._id)} disabled={deleteMut.isPending}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
          {categories.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No categories yet.</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Image URL</Label><Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.name}>{saveMut.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ---------------- Test Series ----------------

function TestSeriesSection({ series, categories }: { series: any[]; categories: any[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "", isPublished: false, isPaid: false, price: 0 });

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "", category: categories[0]?._id ?? "", isPublished: false, isPaid: false, price: 0 }); setOpen(true); };
  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ name: s.name ?? "", description: s.description ?? "", category: s.category?._id ?? s.category ?? "", isPublished: !!s.isPublished, isPaid: !!s.isPaid, price: s.price ?? 0 });
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: () => (editing ? testSeriesService.updateTestSeries(editing._id, form) : testSeriesService.createTestSeries(form)),
    onSuccess: () => {
      toast.success(editing ? "Test series updated" : "Test series created");
      qc.invalidateQueries({ queryKey: ["ad-series"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not save test series"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => testSeriesService.deleteTestSeries(id),
    onSuccess: () => {
      toast.success("Test series deleted");
      qc.invalidateQueries({ queryKey: ["ad-series"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete test series"),
  });

  return (
    <section className="border border-border rounded-md p-4">
      <SectionHeader title="Test Series" onCreate={openCreate} />
      <Table>
        <TableHeader>
          <TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Total Tests</TableHead><TableHead>Published</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {series.map((s) => (
            <TableRow key={s._id}>
              <TableCell>{s.name}</TableCell>
              <TableCell>{s.category?.name ?? "—"}</TableCell>
              <TableCell>{s.totalTests ?? 0}</TableCell>
              <TableCell>{s.isPublished ? "Published" : "Draft"}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(s)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => deleteMut.mutate(s._id)} disabled={deleteMut.isPending}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
          {series.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No test series yet.</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Test Series" : "New Test Series"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between"><Label>Published</Label><Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} /></div>
            <div className="flex items-center justify-between"><Label>Paid</Label><Switch checked={form.isPaid} onCheckedChange={(v) => setForm({ ...form, isPaid: v })} /></div>
            {form.isPaid && <div><Label>Price</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.name || !form.category}>{saveMut.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ---------------- Tests ----------------

function TestsSection({ tests, categories, series }: { tests: any[]; categories: any[]; series: any[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", category: "", testSeries: "", duration: 60,
    negativeMarking: false, negativeMarksPerQuestion: 0, marksPerQuestion: 1,
    isPublished: false, isPaid: false,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", category: categories[0]?._id ?? "", testSeries: "", duration: 60, negativeMarking: false, negativeMarksPerQuestion: 0, marksPerQuestion: 1, isPublished: false, isPaid: false });
    setOpen(true);
  };
  const openEdit = (t: any) => {
    setEditing(t);
    setForm({
      title: t.title ?? "",
      category: t.category?._id ?? t.category ?? "",
      testSeries: t.testSeries?._id ?? t.testSeries ?? "",
      duration: t.duration ?? 60,
      negativeMarking: !!t.negativeMarking,
      negativeMarksPerQuestion: t.negativeMarksPerQuestion ?? 0,
      marksPerQuestion: t.marksPerQuestion ?? 1,
      isPublished: !!t.isPublished,
      isPaid: !!t.isPaid,
    });
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = { ...form, testSeries: form.testSeries || undefined };
      return editing ? testService.updateTest(editing._id, payload) : testService.createTest(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Test updated" : "Test created");
      qc.invalidateQueries({ queryKey: ["ad-tests"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not save test"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => testService.deleteTest(id),
    onSuccess: () => {
      toast.success("Test deleted");
      qc.invalidateQueries({ queryKey: ["ad-tests"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete test"),
  });

  return (
    <section className="border border-border rounded-md p-4">
      <SectionHeader title="Tests" onCreate={openCreate} />
      <Table>
        <TableHeader>
          <TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Qs</TableHead><TableHead>Marks</TableHead><TableHead>Duration</TableHead><TableHead>Published</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {tests.map((t) => (
            <TableRow key={t._id}>
              <TableCell>{t.title}</TableCell>
              <TableCell>{categories.find((c) => c._id === (t.category?._id ?? t.category))?.name ?? "—"}</TableCell>
              <TableCell>{t.totalQuestions}</TableCell>
              <TableCell>{t.totalMarks}</TableCell>
              <TableCell>{t.duration} Min</TableCell>
              <TableCell>{t.isPublished ? "Published" : "Draft"}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(t)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => deleteMut.mutate(t._id)} disabled={deleteMut.isPending}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
          {tests.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No tests yet.</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Test" : "New Test"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Test Series (optional)</Label>
              <Select value={form.testSeries || "none"} onValueChange={(v) => setForm({ ...form, testSeries: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {series.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Duration (minutes)</Label><Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} /></div>
            <div><Label>Marks per Question</Label><Input type="number" value={form.marksPerQuestion} onChange={(e) => setForm({ ...form, marksPerQuestion: Number(e.target.value) })} /></div>
            <div className="flex items-center justify-between"><Label>Negative Marking</Label><Switch checked={form.negativeMarking} onCheckedChange={(v) => setForm({ ...form, negativeMarking: v })} /></div>
            {form.negativeMarking && <div><Label>Negative Marks per Question</Label><Input type="number" value={form.negativeMarksPerQuestion} onChange={(e) => setForm({ ...form, negativeMarksPerQuestion: Number(e.target.value) })} /></div>}
            <div className="flex items-center justify-between"><Label>Published</Label><Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} /></div>
            <div className="flex items-center justify-between"><Label>Paid</Label><Switch checked={form.isPaid} onCheckedChange={(v) => setForm({ ...form, isPaid: v })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.title || !form.category}>{saveMut.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ---------------- Questions ----------------

function QuestionsSection({ tests }: { tests: any[] }) {
  const qc = useQueryClient();
  const [testId, setTestId] = useState<string>(tests[0]?._id ?? "");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ questionText: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "", marks: 1, negativeMarks: 0 });

  const { data: questionsRes, isLoading } = useQuery({
    queryKey: ["ad-questions", testId],
    enabled: !!testId,
    queryFn: () => questionService.getQuestionsAdmin(testId),
  });
  const questions = unwrapList<any>(questionsRes);

  const openCreate = () => { setEditing(null); setForm({ questionText: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "", marks: 1, negativeMarks: 0 }); setOpen(true); };
  const openEdit = (q: any) => {
    setEditing(q);
    setForm({
      questionText: q.questionText ?? "",
      options: (q.options ?? []).map((o: any) => o.text ?? ""),
      correctAnswer: q.correctAnswer ?? 0,
      explanation: q.explanation ?? "",
      marks: q.marks ?? 1,
      negativeMarks: q.negativeMarks ?? 0,
    });
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = { ...form, options: form.options.map((text) => ({ text })), test: testId };
      return editing ? questionService.updateQuestion(editing._id, payload) : questionService.createQuestion(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Question updated" : "Question created");
      qc.invalidateQueries({ queryKey: ["ad-questions", testId] });
      qc.invalidateQueries({ queryKey: ["ad-tests"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not save question"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => questionService.deleteQuestion(id),
    onSuccess: () => {
      toast.success("Question deleted");
      qc.invalidateQueries({ queryKey: ["ad-questions", testId] });
      qc.invalidateQueries({ queryKey: ["ad-tests"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete question"),
  });

  return (
    <section className="border border-border rounded-md p-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-base font-semibold">Questions</h2>
        <div className="flex items-center gap-2">
          <Select value={testId} onValueChange={setTestId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select a test" /></SelectTrigger>
            <SelectContent>{tests.map((t) => <SelectItem key={t._id} value={t._id}>{t.title}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" onClick={openCreate} disabled={!testId}>New</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow><TableHead>Question</TableHead><TableHead>Correct</TableHead><TableHead>Marks</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">Loading…</TableCell></TableRow>}
          {!isLoading && questions.map((q) => (
            <TableRow key={q._id}>
              <TableCell className="max-w-md truncate">{q.questionText}</TableCell>
              <TableCell>{"ABCD"[q.correctAnswer] ?? "—"}</TableCell>
              <TableCell>{q.marks}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(q)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => deleteMut.mutate(q._id)} disabled={deleteMut.isPending}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && questions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">{testId ? "No questions for this test yet." : "Select a test first."}</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Question" : "New Question"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Question Text</Label><Textarea value={form.questionText} onChange={(e) => setForm({ ...form, questionText: e.target.value })} /></div>
            {form.options.map((opt, i) => (
              <div key={i}>
                <Label>Option {"ABCD"[i]}</Label>
                <Input value={opt} onChange={(e) => { const next = [...form.options]; next[i] = e.target.value; setForm({ ...form, options: next }); }} />
              </div>
            ))}
            <div>
              <Label>Correct Answer</Label>
              <Select value={String(form.correctAnswer)} onValueChange={(v) => setForm({ ...form, correctAnswer: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{form.options.map((_, i) => <SelectItem key={i} value={String(i)}>{"ABCD"[i]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Explanation (optional)</Label><Textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Marks</Label><Input type="number" value={form.marks} onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })} /></div>
              <div><Label>Negative Marks</Label><Input type="number" value={form.negativeMarks} onChange={(e) => setForm({ ...form, negativeMarks: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.questionText || form.options.some((o) => !o)}>{saveMut.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ---------------- Users ----------------

function UsersSection({ users }: { users: any[] }) {
  const qc = useQueryClient();

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => userService.updateUserByAdmin(id, { role }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["ad-users"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not update role"),
  });

  const activeMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => userService.updateUserByAdmin(id, { isActive }),
    onSuccess: () => {
      toast.success("User status updated");
      qc.invalidateQueries({ queryKey: ["ad-users"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not update user"),
  });

  return (
    <section className="border border-border rounded-md p-4">
      <h2 className="text-base font-semibold mb-2">Users</h2>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u._id}>
              <TableCell>{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>
                <Select value={u.role} onValueChange={(v) => roleMut.mutate({ id: u._id, role: v })}>
                  <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">student</SelectItem>
                    <SelectItem value="instructor">instructor</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>{u.isActive ? "Active" : "Deactivated"}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" onClick={() => activeMut.mutate({ id: u._id, isActive: !u.isActive })} disabled={activeMut.isPending}>
                  {u.isActive ? "Deactivate" : "Activate"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No users found.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </section>
  );
}
