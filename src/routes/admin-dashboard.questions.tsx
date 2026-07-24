import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { unwrapList } from "@/lib/api-unwrap";
import * as testService from "@/services/testService";
import * as questionService from "@/services/questionService";
import { LoadingRows } from "@/components/admin/LoadingRows";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { AdminPager } from "@/components/admin/AdminPager";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";

export const Route = createFileRoute("/admin-dashboard/questions")({
  component: QuestionsPage,
});

// Real server-generated template — 1-based correctAnswer, requires a `test`
// column per row (see GovtPrep-Backend-Workflow-and-Status.md §7). Blank
// `test` cells are auto-filled with the currently selected test on import.
async function downloadCsvTemplate() {
  try {
    const blob = await questionService.getBulkTemplateCsv();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "questions-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Could not download CSV template");
  }
}

interface CsvRow {
  test: string;
  questionText: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctAnswer: string;
  marks: string;
  explanation: string;
  order: string;
}

function QuestionsPage() {
  const { data: testsRes } = useQuery({ queryKey: ["ad-tests"], queryFn: () => testService.getTests() });
  const tests = unwrapList<any>(testsRes);

  const qc = useQueryClient();
  const [testId, setTestId] = useState<string>("");
  const activeTestId = testId || tests[0]?._id || "";
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ questionText: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "", marks: 1, negativeMarks: 0 });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // CSV state
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<{ rows: CsvRow[]; errors: string[] } | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  const { data: questionsRes, isLoading } = useQuery({
    queryKey: ["ad-questions", activeTestId],
    enabled: !!activeTestId,
    queryFn: () => questionService.getQuestionsAdmin(activeTestId),
  });
  const questions = unwrapList<any>(questionsRes);

  const { search, setSearch, paginated, page, setPage, totalPages } = usePaginatedSearch(questions, ["questionText"]);

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
      const payload = { ...form, options: form.options.map((text) => ({ text })), test: activeTestId };
      return editing ? questionService.updateQuestion(editing._id, payload) : questionService.createQuestion(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Question updated" : "Question created");
      qc.invalidateQueries({ queryKey: ["ad-questions", activeTestId] });
      qc.invalidateQueries({ queryKey: ["ad-tests"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not save question"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => questionService.deleteQuestion(id),
    onSuccess: () => {
      toast.success("Question deleted");
      qc.invalidateQueries({ queryKey: ["ad-questions", activeTestId] });
      qc.invalidateQueries({ queryKey: ["ad-tests"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete question"),
  });

  const bulkMut = useMutation({
    mutationFn: (rows: CsvRow[]) => {
      // Blank `test` cells default to the currently selected test — the
      // server itself requires the column populated on every row.
      const filled = rows.map((r) => ({ ...r, test: r.test || activeTestId }));
      const csvText = Papa.unparse(filled, {
        columns: ["test", "questionText", "option1", "option2", "option3", "option4", "correctAnswer", "marks", "explanation", "order"],
      });
      const blob = new Blob([csvText], { type: "text/csv" });
      return questionService.bulkCreateQuestions(blob, "questions-bulk-upload.csv");
    },
    onSuccess: (res: any) => {
      const created = res?.data?.length ?? "?";
      toast.success(res?.message ?? `${created} question(s) imported successfully`);
      qc.invalidateQueries({ queryKey: ["ad-questions", activeTestId] });
      qc.invalidateQueries({ queryKey: ["ad-tests"] });
      setCsvOpen(false);
      setCsvPreview(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Bulk import failed"),
  });

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: string[] = [];
        results.data.forEach((row, idx) => {
          if (!row.questionText) errors.push(`Row ${idx + 1}: missing questionText`);
          if (!row.option1 || !row.option2 || !row.option3 || !row.option4) errors.push(`Row ${idx + 1}: all 4 options required`);
          const ca = Number(row.correctAnswer);
          if (isNaN(ca) || ca < 1 || ca > 4) errors.push(`Row ${idx + 1}: correctAnswer must be 1–4`);
          if (!row.test && !activeTestId) errors.push(`Row ${idx + 1}: no test selected and no test column in CSV`);
        });
        setCsvPreview({ rows: results.data, errors });
        setCsvOpen(true);
      },
      error: (err) => toast.error(`CSV parse error: ${err.message}`),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-base font-semibold">Questions</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={activeTestId} onValueChange={setTestId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select a test" /></SelectTrigger>
            <SelectContent>{tests.map((t) => <SelectItem key={t._id} value={t._id}>{t.title}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" onClick={openCreate} disabled={!activeTestId}>New</Button>
          <Button size="sm" variant="outline" onClick={downloadCsvTemplate}>Download CSV Template</Button>
          <Button size="sm" variant="outline" onClick={() => csvInputRef.current?.click()} disabled={!activeTestId}>
            Upload CSV
          </Button>
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
        </div>
      </div>

      {activeTestId && (
        <div className="mb-2">
          <Input
            placeholder="Search questions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow><TableHead>Question</TableHead><TableHead>Correct</TableHead><TableHead>Marks</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <LoadingRows colSpan={4} />}
          {!isLoading && paginated.map((q) => (
            <TableRow key={q._id}>
              <TableCell className="max-w-md truncate">{q.questionText}</TableCell>
              <TableCell>{"ABCD"[q.correctAnswer] ?? "—"}</TableCell>
              <TableCell>{q.marks}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(q)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => setDeleteTarget(q._id)} disabled={deleteMut.isPending}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && questions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">{activeTestId ? "No questions for this test yet." : "Select a test first."}</TableCell></TableRow>}
        </TableBody>
      </Table>
      <AdminPager page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Edit / Create dialog */}
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

      {/* CSV preview / confirm dialog */}
      <Dialog open={csvOpen} onOpenChange={(o) => { if (!o) { setCsvOpen(false); setCsvPreview(null); } }}>
        <DialogContent className="max-h-[80vh] overflow-y-auto max-w-2xl">
          <DialogHeader><DialogTitle>CSV Import Preview</DialogTitle></DialogHeader>
          {csvPreview && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{csvPreview.rows.length} row(s) parsed</Badge>
                {csvPreview.errors.length > 0 && <Badge variant="destructive">{csvPreview.errors.length} error(s)</Badge>}
              </div>
              {csvPreview.errors.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 space-y-1">
                  {csvPreview.errors.map((e, i) => <p key={i} className="text-xs text-destructive">{e}</p>)}
                </div>
              )}
              {csvPreview.rows.length > 0 && (
                <div className="border border-border rounded-md overflow-auto max-h-60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Question</TableHead>
                        <TableHead>Correct</TableHead>
                        <TableHead>Marks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvPreview.rows.slice(0, 20).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{i + 1}</TableCell>
                          <TableCell className="max-w-xs truncate text-xs">{r.questionText}</TableCell>
                          <TableCell className="text-xs">{"ABCD"[Number(r.correctAnswer) - 1] ?? r.correctAnswer}</TableCell>
                          <TableCell className="text-xs">{r.marks || 1}</TableCell>
                        </TableRow>
                      ))}
                      {csvPreview.rows.length > 20 && (
                        <TableRow><TableCell colSpan={4} className="text-xs text-center text-muted-foreground">…and {csvPreview.rows.length - 20} more rows</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCsvOpen(false); setCsvPreview(null); }}>Cancel</Button>
            <Button
              onClick={() => csvPreview && bulkMut.mutate(csvPreview.rows)}
              disabled={bulkMut.isPending || !csvPreview || csvPreview.rows.length === 0 || csvPreview.errors.length > 0}
            >
              {bulkMut.isPending ? "Importing…" : `Import ${csvPreview?.rows.length ?? 0} Questions`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget)}
        isPending={deleteMut.isPending}
        itemLabel="this question"
      />
    </div>
  );
}
