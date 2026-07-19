import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { unwrapList } from "@/lib/api-unwrap";
import * as testService from "@/services/testService";
import * as questionService from "@/services/questionService";

export const Route = createFileRoute("/admin-dashboard/questions")({
  component: QuestionsPage,
});

function QuestionsPage() {
  const { data: testsRes } = useQuery({ queryKey: ["ad-tests"], queryFn: () => testService.getTests() });
  const tests = unwrapList<any>(testsRes);

  const qc = useQueryClient();
  const [testId, setTestId] = useState<string>("");
  const activeTestId = testId || tests[0]?._id || "";
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ questionText: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "", marks: 1, negativeMarks: 0 });

  const { data: questionsRes, isLoading } = useQuery({
    queryKey: ["ad-questions", activeTestId],
    enabled: !!activeTestId,
    queryFn: () => questionService.getQuestionsAdmin(activeTestId),
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
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete question"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-base font-semibold">Questions</h2>
        <div className="flex items-center gap-2">
          <Select value={activeTestId} onValueChange={setTestId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select a test" /></SelectTrigger>
            <SelectContent>{tests.map((t) => <SelectItem key={t._id} value={t._id}>{t.title}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" onClick={openCreate} disabled={!activeTestId}>New</Button>
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
          {!isLoading && questions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">{activeTestId ? "No questions for this test yet." : "Select a test first."}</TableCell></TableRow>}
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
    </div>
  );
}
