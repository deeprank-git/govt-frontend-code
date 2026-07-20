import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { unwrapList } from "@/lib/api-unwrap";
import * as categoryService from "@/services/categoryService";
import * as testSeriesService from "@/services/testSeriesService";
import * as testService from "@/services/testService";
import { LoadingRows } from "@/components/admin/LoadingRows";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { AdminPager } from "@/components/admin/AdminPager";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";

export const Route = createFileRoute("/admin-dashboard/tests")({
  component: TestsPage,
});

function TestsPage() {
  const { data: categoriesRes } = useQuery({ queryKey: ["ad-categories"], queryFn: () => categoryService.getCategories() });
  const categories = unwrapList<any>(categoriesRes);
  const { data: seriesRes } = useQuery({ queryKey: ["ad-series"], queryFn: () => testSeriesService.getTestSeries() });
  const series = unwrapList<any>(seriesRes);
  const { data: testsRes, isLoading } = useQuery({ queryKey: ["ad-tests"], queryFn: () => testService.getTests() });
  const tests = unwrapList<any>(testsRes);

  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", category: "", testSeries: "", duration: 60,
    negativeMarking: false, negativeMarksPerQuestion: 0, marksPerQuestion: 1,
    isPublished: false, isPaid: false,
  });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { search, setSearch, paginated, page, setPage, totalPages } = usePaginatedSearch(tests, ["title"]);

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
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete test"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold">Tests</h2>
        <Button size="sm" onClick={openCreate}>New</Button>
      </div>
      <div className="mb-2">
        <Input
          placeholder="Search tests…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Qs</TableHead><TableHead>Marks</TableHead><TableHead>Duration</TableHead><TableHead>Published</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <LoadingRows colSpan={7} />}
          {!isLoading && paginated.map((t) => (
            <TableRow key={t._id}>
              <TableCell>{t.title}</TableCell>
              <TableCell>{categories.find((c) => c._id === (t.category?._id ?? t.category))?.name ?? "—"}</TableCell>
              <TableCell>{t.totalQuestions}</TableCell>
              <TableCell>{t.totalMarks}</TableCell>
              <TableCell>{t.duration} Min</TableCell>
              <TableCell>{t.isPublished ? "Published" : "Draft"}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(t)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => setDeleteTarget(t._id)} disabled={deleteMut.isPending}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && tests.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No tests yet.</TableCell></TableRow>}
        </TableBody>
      </Table>
      <AdminPager page={page} totalPages={totalPages} onPageChange={setPage} />

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

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget)}
        isPending={deleteMut.isPending}
        itemLabel="this test"
      />
    </div>
  );
}
