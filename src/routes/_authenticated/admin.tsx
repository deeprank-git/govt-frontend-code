import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Shield, Users, ClipboardList, FileText, BookOpen, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getUser } from "@/lib/auth-store";
import { unwrapList } from "@/lib/api-unwrap";
import * as categoryService from "@/services/categoryService";
import * as testSeriesService from "@/services/testSeriesService";
import * as testService from "@/services/testService";
import * as questionService from "@/services/questionService";
import * as userService from "@/services/userService";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: () => {
    const user = getUser();
    if (user?.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminPanel,
});

function AdminPanel() {
  const { data: categoriesRes } = useQuery({ queryKey: ["adm-categories"], queryFn: () => categoryService.getCategories() });
  const { data: seriesRes } = useQuery({ queryKey: ["adm-series"], queryFn: () => testSeriesService.getTestSeries() });
  const { data: testsRes } = useQuery({ queryKey: ["adm-tests"], queryFn: () => testService.getTests() });
  const { data: usersRes } = useQuery({ queryKey: ["adm-users"], queryFn: () => userService.getAllUsers() });

  const categories = unwrapList<any>(categoriesRes);
  const series = unwrapList<any>(seriesRes);
  const tests = unwrapList<any>(testsRes);
  const users = unwrapList<any>(usersRes);

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
          <Metric icon={BookOpen} label="Categories" value={categories.length} />
          <Metric icon={ClipboardList} label="Test Series" value={series.length} />
          <Metric icon={FileText} label="Tests" value={tests.length} />
          <Metric icon={Users} label="Users" value={users.length} />
        </div>

        <Tabs defaultValue="categories">
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="series">Test Series</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4"><CategoriesTab categories={categories} /></TabsContent>
          <TabsContent value="series" className="mt-4"><TestSeriesTab series={series} categories={categories} /></TabsContent>
          <TabsContent value="tests" className="mt-4"><TestsTab tests={tests} categories={categories} series={series} /></TabsContent>
          <TabsContent value="questions" className="mt-4"><QuestionsTab tests={tests} /></TabsContent>
          <TabsContent value="users" className="mt-4"><UsersTab users={users} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: any) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <span className="h-10 w-10 grid place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-display font-bold">{value}</div>
      </div>
    </Card>
  );
}

function SectionHeader({ title, onCreate }: { title: string; onCreate: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display font-bold">{title}</h2>
      <Button size="sm" onClick={onCreate}><Plus className="h-4 w-4 mr-1" /> New</Button>
    </div>
  );
}

// ---------------- Categories ----------------

function CategoriesTab({ categories }: { categories: any[] }) {
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
      qc.invalidateQueries({ queryKey: ["adm-categories"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not save category"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["adm-categories"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete category"),
  });

  return (
    <Card className="p-4">
      <SectionHeader title="Categories" onCreate={openCreate} />
      <Table>
        <TableHeader>
          <TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((c) => (
            <TableRow key={c._id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell>{c.slug}</TableCell>
              <TableCell className="max-w-xs truncate">{c.description || "—"}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(c._id)} disabled={deleteMut.isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
          {categories.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No categories yet.</TableCell></TableRow>}
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
    </Card>
  );
}

// ---------------- Test Series ----------------

function TestSeriesTab({ series, categories }: { series: any[]; categories: any[] }) {
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
      qc.invalidateQueries({ queryKey: ["adm-series"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not save test series"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => testSeriesService.deleteTestSeries(id),
    onSuccess: () => {
      toast.success("Test series deleted");
      qc.invalidateQueries({ queryKey: ["adm-series"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete test series"),
  });

  return (
    <Card className="p-4">
      <SectionHeader title="Test Series" onCreate={openCreate} />
      <Table>
        <TableHeader>
          <TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Total Tests</TableHead><TableHead>Published</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {series.map((s) => (
            <TableRow key={s._id}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>{s.category?.name ?? "—"}</TableCell>
              <TableCell>{s.totalTests ?? 0}</TableCell>
              <TableCell>{s.isPublished ? <Badge className="bg-success/15 text-success-foreground border-transparent">Published</Badge> : <Badge variant="outline">Draft</Badge>}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(s._id)} disabled={deleteMut.isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
          {series.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No test series yet.</TableCell></TableRow>}
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
    </Card>
  );
}

// ---------------- Tests ----------------

function TestsTab({ tests, categories, series }: { tests: any[]; categories: any[]; series: any[] }) {
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
      qc.invalidateQueries({ queryKey: ["adm-tests"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not save test"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => testService.deleteTest(id),
    onSuccess: () => {
      toast.success("Test deleted");
      qc.invalidateQueries({ queryKey: ["adm-tests"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete test"),
  });

  return (
    <Card className="p-4">
      <SectionHeader title="Tests" onCreate={openCreate} />
      <Table>
        <TableHeader>
          <TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Qs</TableHead><TableHead>Marks</TableHead><TableHead>Duration</TableHead><TableHead>Published</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {tests.map((t) => (
            <TableRow key={t._id}>
              <TableCell className="font-medium">{t.title}</TableCell>
              <TableCell>{categories.find((c) => c._id === (t.category?._id ?? t.category))?.name ?? "—"}</TableCell>
              <TableCell>{t.totalQuestions}</TableCell>
              <TableCell>{t.totalMarks}</TableCell>
              <TableCell>{t.duration} Min</TableCell>
              <TableCell>{t.isPublished ? <Badge className="bg-success/15 text-success-foreground border-transparent">Published</Badge> : <Badge variant="outline">Draft</Badge>}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(t._id)} disabled={deleteMut.isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
          {tests.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No tests yet.</TableCell></TableRow>}
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
    </Card>
  );
}

// ---------------- Questions ----------------

function QuestionsTab({ tests }: { tests: any[] }) {
  const qc = useQueryClient();
  const [testId, setTestId] = useState<string>(tests[0]?._id ?? "");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ questionText: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "", marks: 1, negativeMarks: 0 });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const { data: questionsRes, isLoading } = useQuery({
    queryKey: ["adm-questions", testId],
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
      qc.invalidateQueries({ queryKey: ["adm-questions", testId] });
      qc.invalidateQueries({ queryKey: ["adm-tests"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not save question"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => questionService.deleteQuestion(id),
    onSuccess: () => {
      toast.success("Question deleted");
      qc.invalidateQueries({ queryKey: ["adm-questions", testId] });
      qc.invalidateQueries({ queryKey: ["adm-tests"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete question"),
  });

  const bulkMut = useMutation({
    mutationFn: () => {
      const parsed = JSON.parse(bulkText);
      const withTest = (Array.isArray(parsed) ? parsed : []).map((q: any) => ({ ...q, test: testId }));
      return questionService.bulkCreateQuestions(withTest);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message ?? "Questions uploaded");
      qc.invalidateQueries({ queryKey: ["adm-questions", testId] });
      qc.invalidateQueries({ queryKey: ["adm-tests"] });
      setBulkOpen(false);
      setBulkText("");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Bulk upload failed — check the JSON format"),
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h2 className="font-display font-bold">Questions</h2>
        <div className="flex items-center gap-2">
          <Select value={testId} onValueChange={setTestId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select a test" /></SelectTrigger>
            <SelectContent>{tests.map((t) => <SelectItem key={t._id} value={t._id}>{t.title}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} disabled={!testId}>Bulk Upload (JSON)</Button>
          <Button size="sm" onClick={openCreate} disabled={!testId}><Plus className="h-4 w-4 mr-1" /> New</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow><TableHead>Question</TableHead><TableHead>Correct</TableHead><TableHead>Marks</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>}
          {!isLoading && questions.map((q) => (
            <TableRow key={q._id}>
              <TableCell className="max-w-md truncate">{q.questionText}</TableCell>
              <TableCell>{"ABCD"[q.correctAnswer] ?? "—"}</TableCell>
              <TableCell>{q.marks}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(q)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(q._id)} disabled={deleteMut.isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && questions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">{testId ? "No questions for this test yet." : "Select a test first."}</TableCell></TableRow>}
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

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Bulk Upload Questions</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">
            Paste a JSON array. Each item needs: questionText, options (array of 4 {"{ text }"}), correctAnswer (0-3), marks, negativeMarks.
          </p>
          <Textarea rows={10} className="font-mono text-xs" value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder='[{"questionText":"2+2=?","options":[{"text":"3"},{"text":"4"},{"text":"5"},{"text":"6"}],"correctAnswer":1,"marks":1,"negativeMarks":0}]' />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={() => bulkMut.mutate()} disabled={bulkMut.isPending || !bulkText.trim()}>{bulkMut.isPending ? "Uploading…" : "Upload"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------- Users ----------------

function UsersTab({ users }: { users: any[] }) {
  const qc = useQueryClient();

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => userService.updateUserByAdmin(id, { role }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["adm-users"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not update role"),
  });

  const activeMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => userService.updateUserByAdmin(id, { isActive }),
    onSuccess: () => {
      toast.success("User status updated");
      qc.invalidateQueries({ queryKey: ["adm-users"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not update user"),
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold">Users</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u._id}>
              <TableCell className="font-medium">{u.name}</TableCell>
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
              <TableCell>{u.isActive ? <Badge className="bg-success/15 text-success-foreground border-transparent">Active</Badge> : <Badge variant="destructive">Deactivated</Badge>}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" onClick={() => activeMut.mutate({ id: u._id, isActive: !u.isActive })} disabled={activeMut.isPending}>
                  {u.isActive ? "Deactivate" : "Activate"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No users found.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}
