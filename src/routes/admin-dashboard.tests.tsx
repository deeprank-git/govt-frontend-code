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
import { Plus, X, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { unwrapList, unwrapItem } from "@/lib/api-unwrap";
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

// _id is only present for sections that already exist on the server — sending
// it back on PATCH preserves that subdocument's identity instead of Mongoose
// minting a new one; freshly-added rows omit it so the server assigns one.
type SectionForm = { _id?: string; name: string; no_of_questions: number; no_of_marks: number; duration: number };
const emptySection: SectionForm = { name: "", no_of_questions: 0, no_of_marks: 0, duration: 0 };

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
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", category: "", testSeries: "", duration: 60,
    isPublished: false, isPaid: false,
  });
  const [sections, setSections] = useState<SectionForm[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { search, setSearch, paginated, page, setPage, totalPages } = usePaginatedSearch(tests, ["title"]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", category: categories[0]?._id ?? "", testSeries: "", duration: 60, isPublished: false, isPaid: false });
    setSections([]);
    setOpen(true);
  };
  const openEdit = (t: any) => {
    setEditing(t);
    setForm({
      title: t.title ?? "",
      category: t.category?._id ?? t.category ?? "",
      testSeries: t.testSeries?._id ?? t.testSeries ?? "",
      duration: t.duration ?? 60,
      isPublished: !!t.isPublished,
      isPaid: !!t.isPaid,
    });
    setSections([]);
    setOpen(true);
    // The list row (used above) is a projection that omits `sections` (and
    // may be stale on totalQuestions/totalMarks) — fetch the full doc for
    // the edit form specifically.
    setSectionsLoading(true);
    testService
      .getTestById(t._id)
      .then((res) => {
        const full = unwrapItem<any>(res) ?? t;
        setEditing(full);
        setSections(
          (full.sections ?? []).map((s: any) => ({
            _id: s._id,
            name: s.name ?? "",
            no_of_questions: s.no_of_questions ?? 0,
            no_of_marks: s.no_of_marks ?? 0,
            duration: s.duration ?? 0,
          })),
        );
      })
      .catch(() => toast.error("Could not load section details"))
      .finally(() => setSectionsLoading(false));
  };

  const namedSections = sections.filter((s) => s.name.trim());
  const sectionsInvalid = namedSections.some(
    (s) => s.no_of_questions <= 0 || s.no_of_marks <= 0 || s.duration <= 0,
  );
  const sectionQuestionTotal = namedSections.reduce((sum, s) => sum + (s.no_of_questions || 0), 0);
  const sectionMarksTotal = namedSections.reduce((sum, s) => sum + (s.no_of_marks || 0), 0);

  const moveSection = (i: number, dir: -1 | 1) => {
    const target = i + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[i], next[target]] = [next[target], next[i]];
    setSections(next);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        testSeries: form.testSeries || undefined,
        sections: namedSections.map((s) => ({
          ...(s._id ? { _id: s._id } : {}),
          name: s.name.trim(),
          no_of_questions: Number(s.no_of_questions),
          no_of_marks: Number(s.no_of_marks),
          duration: Number(s.duration),
        })),
      };
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
          <TableRow><TableHead>Title</TableHead><TableHead>Qs</TableHead><TableHead>Marks</TableHead><TableHead>Duration</TableHead><TableHead>Published</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <LoadingRows colSpan={6} />}
          {!isLoading && paginated.map((t) => (
            <TableRow key={t._id}>
              <TableCell>{t.title}</TableCell>
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
          {!isLoading && tests.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">No tests yet.</TableCell></TableRow>}
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
            <div className="flex items-center justify-between"><Label>Published</Label><Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} /></div>
            <div className="flex items-center justify-between"><Label>Paid</Label><Switch checked={form.isPaid} onCheckedChange={(v) => setForm({ ...form, isPaid: v })} /></div>

            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <Label>Sections</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setSections([...sections, { ...emptySection }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Section
                </Button>
              </div>
              {sectionsLoading ? (
                <p className="text-xs text-muted-foreground">Loading sections…</p>
              ) : (
                <div className="space-y-2">
                  {sections.map((s, i) => {
                    const named = !!s.name.trim();
                    const rowInvalid = named && (s.no_of_questions <= 0 || s.no_of_marks <= 0 || s.duration <= 0);
                    return (
                      <div key={s._id ?? i} className="rounded-md border border-border p-2">
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                            <Label className="text-[10px] font-normal text-muted-foreground">Section Name</Label>
                            <Input
                              placeholder="e.g. Quant"
                              value={s.name}
                              onChange={(e) => setSections(sections.map((x, xi) => xi === i ? { ...x, name: e.target.value } : x))}
                            />
                          </div>
                          <div className="flex flex-col gap-1 w-24">
                            <Label className="text-[10px] font-normal text-muted-foreground">No. of Questions</Label>
                            <Input
                              type="number"
                              value={s.no_of_questions}
                              onChange={(e) => setSections(sections.map((x, xi) => xi === i ? { ...x, no_of_questions: Number(e.target.value) } : x))}
                            />
                          </div>
                          <div className="flex flex-col gap-1 w-24">
                            <Label className="text-[10px] font-normal text-muted-foreground">Marks</Label>
                            <Input
                              type="number"
                              value={s.no_of_marks}
                              onChange={(e) => setSections(sections.map((x, xi) => xi === i ? { ...x, no_of_marks: Number(e.target.value) } : x))}
                            />
                          </div>
                          <div className="flex flex-col gap-1 w-28">
                            <Label className="text-[10px] font-normal text-muted-foreground">Duration (min)</Label>
                            <Input
                              type="number"
                              value={s.duration}
                              onChange={(e) => setSections(sections.map((x, xi) => xi === i ? { ...x, duration: Number(e.target.value) } : x))}
                            />
                          </div>
                          <div className="flex flex-col shrink-0">
                            <Button type="button" size="icon" variant="ghost" className="h-4 w-6" disabled={i === 0} onClick={() => moveSection(i, -1)}>
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" className="h-4 w-6" disabled={i === sections.length - 1} onClick={() => moveSection(i, 1)}>
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <Button type="button" size="icon" variant="ghost" className="shrink-0" onClick={() => setSections(sections.filter((_, xi) => xi !== i))}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {rowInvalid && (
                          <p className="text-xs text-destructive mt-1">Questions, marks and duration must all be greater than 0.</p>
                        )}
                      </div>
                    );
                  })}
                  {sections.length === 0 && <p className="text-xs text-muted-foreground">No sections added yet.</p>}
                  {namedSections.length > 0 && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Total across sections: {sectionQuestionTotal} questions · {sectionMarksTotal} marks
                      {editing && (
                        <>
                          {" "}(test currently has {editing.totalQuestions ?? 0} questions / {editing.totalMarks ?? 0} marks
                          from its question bank — these don't need to match; sections just describe the intended structure)
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || sectionsLoading || sectionsInvalid || !form.title || !form.category}
            >
              {saveMut.isPending ? "Saving…" : "Save"}
            </Button>
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
