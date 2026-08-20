import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, X, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { unwrapItem, unwrapList } from "@/lib/api-unwrap";
import * as testService from "@/services/testService";
import * as questionService from "@/services/questionService";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

type SectionForm = { _id?: string; name: string; no_of_questions: number; no_of_marks: number; duration: number };
const emptySection: SectionForm = { name: "", no_of_questions: 0, no_of_marks: 0, duration: 0 };

type QForm = {
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  marks: number;
  negativeMarks: number;
  section: string;
};
const emptyQForm = (): QForm => ({
  questionText: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  explanation: "",
  marks: 1,
  negativeMarks: 0,
  section: "",
});

interface CsvRow {
  test: string;
  questionText: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  option5?: string;
  correctAnswer: string;
  marks: string;
  explanation: string;
  order: string;
  section?: string;
}

const OPTION_LETTERS = "ABCDE";

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

interface TestWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTest: any | null;
  categories: any[];
  series: any[];
  onSaved: () => void;
}

export function TestWizardDialog({
  open,
  onOpenChange,
  editingTest,
  categories,
  series,
  onSaved,
}: TestWizardDialogProps) {
  const qc = useQueryClient();
  const isEdit = !!editingTest;

  const [step, setStep] = useState<1 | 2>(1);

  const [testForm, setTestForm] = useState({
    title: "",
    category: categories[0]?._id ?? "",
    testSeries: "",
    duration: 60,
    isPublished: false,
    isPaid: false,
  });
  const [sections, setSections] = useState<SectionForm[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  // Create mode only: questions held in local state until final Save
  const [pendingQuestions, setPendingQuestions] = useState<QForm[]>([]);
  const [pendingEditIdx, setPendingEditIdx] = useState<number | null>(null);

  // Inline question form state (both modes)
  const [qFormOpen, setQFormOpen] = useState(false);
  const [qForm, setQForm] = useState<QForm>(emptyQForm());
  const [editingQuestion, setEditingQuestion] = useState<any>(null);

  // Edit mode: delete confirm for live questions
  const [deleteQTarget, setDeleteQTarget] = useState<string | null>(null);

  // CSV state
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<{ rows: CsvRow[]; errors: string[] } | null>(null);
  const [csvPreviewOpen, setCsvPreviewOpen] = useState(false);

  // Reset wizard whenever the dialog opens or the target test changes
  useEffect(() => {
    if (!open) return;

    setStep(1);
    setQFormOpen(false);
    setEditingQuestion(null);
    setPendingEditIdx(null);
    setPendingQuestions([]);
    setQForm(emptyQForm());
    setCsvPreview(null);
    setCsvPreviewOpen(false);

    if (editingTest) {
      setTestForm({
        title: editingTest.title ?? "",
        category: editingTest.category?._id ?? editingTest.category ?? "",
        testSeries: editingTest.testSeries?._id ?? editingTest.testSeries ?? "",
        duration: editingTest.duration ?? 60,
        isPublished: !!editingTest.isPublished,
        isPaid: !!editingTest.isPaid,
      });
      setSections([]);
      setSectionsLoading(true);
      testService
        .getTestById(editingTest._id)
        .then((res) => {
          const full = unwrapItem<any>(res) ?? editingTest;
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
    } else {
      setTestForm({
        title: "",
        category: categories[0]?._id ?? "",
        testSeries: "",
        duration: 60,
        isPublished: false,
        isPaid: false,
      });
      setSections([]);
    }
  }, [open, editingTest]);

  // Edit mode: live questions — only fetched once the user reaches step 2
  const { data: questionsRes, isLoading: qLoading } = useQuery({
    queryKey: ["ad-questions", editingTest?._id],
    enabled: isEdit && !!editingTest?._id && open && step === 2,
    queryFn: () => questionService.getQuestionsAdmin(editingTest!._id),
  });
  const liveQuestions = unwrapList<any>(questionsRes);

  // Section helpers
  const namedSections = sections.filter((s) => s.name.trim());
  const sectionsInvalid = namedSections.some(
    (s) => s.no_of_questions <= 0 || s.no_of_marks <= 0 || s.duration <= 0,
  );
  const sectionQTotal = namedSections.reduce((sum, s) => sum + (s.no_of_questions || 0), 0);
  const sectionMTotal = namedSections.reduce((sum, s) => sum + (s.no_of_marks || 0), 0);

  const moveSection = (i: number, dir: -1 | 1) => {
    const target = i + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[i], next[target]] = [next[target], next[i]];
    setSections(next);
  };

  // Final save:
  //   edit mode  → PATCH test details only (questions are already live)
  //   create mode → POST /admin/tests/with-questions (test + questions in one call)
  const saveMut = useMutation({
    mutationFn: async () => {
      const sectionPayload = namedSections.map((s) => ({
        ...(s._id ? { _id: s._id } : {}),
        name: s.name.trim(),
        no_of_questions: Number(s.no_of_questions),
        no_of_marks: Number(s.no_of_marks),
        duration: Number(s.duration),
      }));

      if (isEdit) {
        return testService.updateTest(editingTest._id, {
          ...testForm,
          testSeries: testForm.testSeries || undefined,
          sections: sectionPayload,
        });
      }

      return testService.createTestWithQuestions({
        ...testForm,
        testSeries: testForm.testSeries || undefined,
        sections: sectionPayload,
        questions: pendingQuestions.map((q) => ({
          questionText: q.questionText,
          options: q.options.map((text) => ({ text })),
          correctAnswer: q.correctAnswer,
          ...(q.explanation ? { explanation: q.explanation } : {}),
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          // section is a name string on this endpoint (sections are being created simultaneously)
          ...(q.section ? { section: q.section } : {}),
        })),
      });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Test updated" : "Test created");
      onSaved();
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Could not save test"),
  });

  // Edit mode: live question save (add or update immediately)
  const saveQLiveMut = useMutation({
    mutationFn: () => {
      const payload = {
        questionText: qForm.questionText,
        options: qForm.options.map((text) => ({ text })),
        correctAnswer: qForm.correctAnswer,
        ...(qForm.explanation ? { explanation: qForm.explanation } : {}),
        marks: qForm.marks,
        negativeMarks: qForm.negativeMarks,
        ...(qForm.section ? { section: qForm.section } : {}),
        test: editingTest!._id,
      };
      return editingQuestion
        ? questionService.updateQuestion(editingQuestion._id, payload)
        : questionService.createQuestion(payload);
    },
    onSuccess: () => {
      toast.success(editingQuestion ? "Question updated" : "Question added");
      qc.invalidateQueries({ queryKey: ["ad-questions", editingTest!._id] });
      qc.invalidateQueries({ queryKey: ["ad-tests"] });
      setQFormOpen(false);
      setEditingQuestion(null);
      setQForm(emptyQForm());
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Could not save question"),
  });

  // Edit mode: live question delete
  const deleteQLiveMut = useMutation({
    mutationFn: (id: string) => questionService.deleteQuestion(id),
    onSuccess: () => {
      toast.success("Question deleted");
      qc.invalidateQueries({ queryKey: ["ad-questions", editingTest!._id] });
      qc.invalidateQueries({ queryKey: ["ad-tests"] });
      setDeleteQTarget(null);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Could not delete question"),
  });

  // Edit mode: bulk CSV import (applies immediately)
  const bulkMut = useMutation({
    mutationFn: (rows: CsvRow[]) => {
      const filled = rows.map((r) => {
        // CSV carries section names; backend requires section IDs — map here.
        const sectionId = r.section?.trim()
          ? namedSections.find(
              (s) => s.name.trim().toLowerCase() === r.section!.trim().toLowerCase()
            )?._id ?? ""
          : "";
        return { ...r, test: r.test || editingTest!._id, section: sectionId };
      });
      const hasOption5 = filled.some((r) => r.option5?.trim());
      const hasSection = filled.some((r) => r.section?.trim());
      const csvText = Papa.unparse(filled, {
        columns: [
          "test", "questionText", "option1", "option2", "option3", "option4",
          ...(hasOption5 ? ["option5"] : []),
          "correctAnswer", "marks", "explanation", "order",
          ...(hasSection ? ["section"] : []),
        ],
      });
      const blob = new Blob([csvText], { type: "text/csv" });
      return questionService.bulkCreateQuestions(blob, "questions-bulk-upload.csv");
    },
    onSuccess: (res: any) => {
      const created = res?.data?.length ?? "?";
      toast.success(res?.message ?? `${created} question(s) imported`);
      qc.invalidateQueries({ queryKey: ["ad-questions", editingTest!._id] });
      qc.invalidateQueries({ queryKey: ["ad-tests"] });
      setCsvPreviewOpen(false);
      setCsvPreview(null);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Bulk import failed"),
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
          if (!row.option1 || !row.option2 || !row.option3 || !row.option4)
            errors.push(`Row ${idx + 1}: options 1–4 are required`);
          const maxOption = row.option5?.trim() ? 5 : 4;
          const ca = Number(row.correctAnswer);
          if (isNaN(ca) || ca < 1 || ca > maxOption)
            errors.push(`Row ${idx + 1}: correctAnswer must be 1–${maxOption}`);
        });
        setCsvPreview({ rows: results.data, errors });
        setCsvPreviewOpen(true);
        setQFormOpen(false);
      },
      error: (err) => toast.error(`CSV parse error: ${err.message}`),
    });
  };

  // Create mode: convert CSV rows to pending questions (no API call)
  const confirmCsvCreate = () => {
    if (!csvPreview) return;
    const converted: QForm[] = csvPreview.rows.map((r) => ({
      questionText: r.questionText,
      options: [
        r.option1, r.option2, r.option3, r.option4,
        ...(r.option5?.trim() ? [r.option5] : []),
      ],
      correctAnswer: Number(r.correctAnswer) - 1, // CSV is 1-based
      explanation: r.explanation ?? "",
      marks: Number(r.marks) || 1,
      negativeMarks: 0,
      section: r.section?.trim() ?? "",
    }));
    setPendingQuestions((prev) => [...prev, ...converted]);
    toast.success(`${converted.length} question(s) added`);
    setCsvPreviewOpen(false);
    setCsvPreview(null);
  };

  const openAddQuestion = () => {
    setEditingQuestion(null);
    setPendingEditIdx(null);
    setQForm(emptyQForm());
    setCsvPreviewOpen(false);
    setQFormOpen(true);
  };

  const openEditLiveQ = (q: any) => {
    setEditingQuestion(q);
    setPendingEditIdx(null);
    setQForm({
      questionText: q.questionText ?? "",
      options: (q.options ?? []).map((o: any) => o.text ?? ""),
      correctAnswer: q.correctAnswer ?? 0,
      explanation: q.explanation ?? "",
      marks: q.marks ?? 1,
      negativeMarks: q.negativeMarks ?? 0,
      section: namedSections.some((s) => s._id === q.section) ? q.section : "",
    });
    setQFormOpen(true);
  };

  const openEditPendingQ = (idx: number) => {
    setEditingQuestion(null);
    setPendingEditIdx(idx);
    setQForm({ ...pendingQuestions[idx] });
    setQFormOpen(true);
  };

  const savePendingQ = () => {
    if (pendingEditIdx !== null) {
      const next = [...pendingQuestions];
      next[pendingEditIdx] = { ...qForm };
      setPendingQuestions(next);
    } else {
      setPendingQuestions((prev) => [...prev, { ...qForm }]);
    }
    setQFormOpen(false);
    setPendingEditIdx(null);
    setQForm(emptyQForm());
  };

  const closeQForm = () => {
    setQFormOpen(false);
    setEditingQuestion(null);
    setPendingEditIdx(null);
    setQForm(emptyQForm());
  };

  const step1Valid = !!testForm.title && !!testForm.category && !sectionsInvalid && !sectionsLoading;
  const qFormValid = !!qForm.questionText && qForm.options.slice(0, 4).every((o) => !!o);
  const panelOpen = qFormOpen || csvPreviewOpen;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Test" : "New Test"}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Step {step} of 2 — {step === 1 ? "Test Details" : "Questions"}
            </p>
          </DialogHeader>

          {/* ── Step 1: Test Details ── */}
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={testForm.title}
                  onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={testForm.category}
                  onValueChange={(v) => setTestForm({ ...testForm, category: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Test Series (optional)</Label>
                <Select
                  value={testForm.testSeries || "none"}
                  onValueChange={(v) => setTestForm({ ...testForm, testSeries: v === "none" ? "" : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {series.map((s) => (
                      <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={testForm.duration}
                  onChange={(e) => setTestForm({ ...testForm, duration: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Published</Label>
                <Switch
                  checked={testForm.isPublished}
                  onCheckedChange={(v) => setTestForm({ ...testForm, isPublished: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Paid</Label>
                <Switch
                  checked={testForm.isPaid}
                  onCheckedChange={(v) => setTestForm({ ...testForm, isPaid: v })}
                />
              </div>

              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <Label>Sections</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSections([...sections, { ...emptySection }])}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Section
                  </Button>
                </div>
                {sectionsLoading ? (
                  <p className="text-xs text-muted-foreground">Loading sections…</p>
                ) : (
                  <div className="space-y-2">
                    {sections.map((s, i) => {
                      const named = !!s.name.trim();
                      const rowInvalid =
                        named && (s.no_of_questions <= 0 || s.no_of_marks <= 0 || s.duration <= 0);
                      return (
                        <div key={s._id ?? i} className="rounded-md border border-border p-2">
                          <div className="flex flex-wrap items-end gap-2">
                            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                              <Label className="text-[10px] font-normal text-muted-foreground">
                                Section Name
                              </Label>
                              <Input
                                placeholder="e.g. Quant"
                                value={s.name}
                                onChange={(e) =>
                                  setSections(
                                    sections.map((x, xi) =>
                                      xi === i ? { ...x, name: e.target.value } : x,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <div className="flex flex-col gap-1 w-24">
                              <Label className="text-[10px] font-normal text-muted-foreground">
                                No. of Questions
                              </Label>
                              <Input
                                type="number"
                                value={s.no_of_questions}
                                onChange={(e) =>
                                  setSections(
                                    sections.map((x, xi) =>
                                      xi === i ? { ...x, no_of_questions: Number(e.target.value) } : x,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <div className="flex flex-col gap-1 w-24">
                              <Label className="text-[10px] font-normal text-muted-foreground">
                                Marks
                              </Label>
                              <Input
                                type="number"
                                value={s.no_of_marks}
                                onChange={(e) =>
                                  setSections(
                                    sections.map((x, xi) =>
                                      xi === i ? { ...x, no_of_marks: Number(e.target.value) } : x,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <div className="flex flex-col gap-1 w-28">
                              <Label className="text-[10px] font-normal text-muted-foreground">
                                Duration (min)
                              </Label>
                              <Input
                                type="number"
                                value={s.duration}
                                onChange={(e) =>
                                  setSections(
                                    sections.map((x, xi) =>
                                      xi === i ? { ...x, duration: Number(e.target.value) } : x,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <div className="flex flex-col shrink-0">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-4 w-6"
                                disabled={i === 0}
                                onClick={() => moveSection(i, -1)}
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-4 w-6"
                                disabled={i === sections.length - 1}
                                onClick={() => moveSection(i, 1)}
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="shrink-0"
                              onClick={() => setSections(sections.filter((_, xi) => xi !== i))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {rowInvalid && (
                            <p className="text-xs text-destructive mt-1">
                              Questions, marks and duration must all be greater than 0.
                            </p>
                          )}
                        </div>
                      );
                    })}
                    {sections.length === 0 && (
                      <p className="text-xs text-muted-foreground">No sections added yet.</p>
                    )}
                    {namedSections.length > 0 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        Total across sections: {sectionQTotal} questions · {sectionMTotal} marks
                        {isEdit && (
                          <>
                            {" "}(test currently has {editingTest.totalQuestions ?? 0} questions /{" "}
                            {editingTest.totalMarks ?? 0} marks from its question bank — these don't
                            need to match; sections just describe the intended structure)
                          </>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Questions ── */}
          {step === 2 && (
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-muted-foreground">
                  {isEdit
                    ? `${liveQuestions.length} question(s) — changes apply immediately`
                    : `${pendingQuestions.length} question(s) — will be saved with the test`}
                </p>
                {!panelOpen && (
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={openAddQuestion}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Question
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={downloadCsvTemplate}>
                      Download CSV Template
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => csvInputRef.current?.click()}
                    >
                      Upload CSV
                    </Button>
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCsvFile}
                    />
                  </div>
                )}
              </div>

              {/* Question list */}
              {!csvPreviewOpen && (
                isEdit ? (
                  qLoading ? (
                    <p className="text-xs text-muted-foreground">Loading questions…</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Question</TableHead>
                          <TableHead>Correct</TableHead>
                          <TableHead>Marks</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {liveQuestions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">
                              No questions yet.
                            </TableCell>
                          </TableRow>
                        )}
                        {liveQuestions.map((q) => (
                          <TableRow key={q._id}>
                            <TableCell className="max-w-xs truncate text-sm">{q.questionText}</TableCell>
                            <TableCell className="text-sm">{OPTION_LETTERS[q.correctAnswer] ?? "—"}</TableCell>
                            <TableCell className="text-sm">{q.marks}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button size="sm" variant="outline" onClick={() => openEditLiveQ(q)}>Edit</Button>
                              <Button size="sm" variant="outline" onClick={() => setDeleteQTarget(q._id)}>Delete</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )
                ) : pendingQuestions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Correct</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingQuestions.map((q, i) => (
                        <TableRow key={i}>
                          <TableCell className="max-w-xs truncate text-sm">{q.questionText}</TableCell>
                          <TableCell className="text-sm">{OPTION_LETTERS[q.correctAnswer] ?? "—"}</TableCell>
                          <TableCell className="text-sm">{q.marks}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => openEditPendingQ(i)}>Edit</Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPendingQuestions(pendingQuestions.filter((_, xi) => xi !== i))}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  !qFormOpen && (
                    <p className="text-xs text-muted-foreground">
                      No questions added yet. You can add them now or skip and add later.
                    </p>
                  )
                )
              )}

              {/* Inline question form */}
              {qFormOpen && (
                <div className="rounded-md border border-border p-3 space-y-3">
                  <p className="text-sm font-medium">
                    {isEdit
                      ? editingQuestion ? "Edit Question" : "Add Question"
                      : pendingEditIdx !== null ? "Edit Question" : "Add Question"}
                  </p>
                  <div>
                    <Label>Question Text</Label>
                    <Textarea
                      value={qForm.questionText}
                      onChange={(e) => setQForm({ ...qForm, questionText: e.target.value })}
                    />
                  </div>
                  {namedSections.length > 0 && (
                    <div>
                      <Label>Section</Label>
                      <Select
                        value={qForm.section || "none"}
                        onValueChange={(v) => setQForm({ ...qForm, section: v === "none" ? "" : v })}
                      >
                        <SelectTrigger><SelectValue placeholder="No section" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No section</SelectItem>
                          {namedSections.map((s, i) => {
                            // Edit mode: sections have server IDs; create mode: use name as value
                            const val = isEdit ? s._id! : s.name;
                            return (
                              <SelectItem key={isEdit ? s._id! : i} value={val}>
                                {s.name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {qForm.options.map((opt, i) => (
                    <div key={i}>
                      <Label>Option {OPTION_LETTERS[i]}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const next = [...qForm.options];
                            next[i] = e.target.value;
                            setQForm({ ...qForm, options: next });
                          }}
                        />
                        {i === 4 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setQForm({
                                ...qForm,
                                options: qForm.options.slice(0, 4),
                                correctAnswer: qForm.correctAnswer > 3 ? 0 : qForm.correctAnswer,
                              })
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {qForm.options.length < 5 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setQForm({ ...qForm, options: [...qForm.options, ""] })}
                    >
                      + Add Option {OPTION_LETTERS[qForm.options.length]}
                    </Button>
                  )}
                  <div>
                    <Label>Correct Answer</Label>
                    <Select
                      value={String(qForm.correctAnswer)}
                      onValueChange={(v) => setQForm({ ...qForm, correctAnswer: Number(v) })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {qForm.options.map((_, i) => (
                          <SelectItem key={i} value={String(i)}>{OPTION_LETTERS[i]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Explanation (optional)</Label>
                    <Textarea
                      value={qForm.explanation}
                      onChange={(e) => setQForm({ ...qForm, explanation: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Marks</Label>
                      <Input
                        type="number"
                        value={qForm.marks}
                        onChange={(e) => setQForm({ ...qForm, marks: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Negative Marks</Label>
                      <Input
                        type="number"
                        value={qForm.negativeMarks}
                        onChange={(e) => setQForm({ ...qForm, negativeMarks: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={closeQForm}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!qFormValid || (isEdit && saveQLiveMut.isPending)}
                      onClick={() => (isEdit ? saveQLiveMut.mutate() : savePendingQ())}
                    >
                      {isEdit && saveQLiveMut.isPending ? "Saving…" : "Save Question"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Inline CSV preview */}
              {csvPreviewOpen && csvPreview && (
                <div className="rounded-md border border-border p-3 space-y-3">
                  <p className="text-sm font-medium">CSV Import Preview</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{csvPreview.rows.length} row(s) parsed</Badge>
                    {csvPreview.errors.length > 0 && (
                      <Badge variant="destructive">{csvPreview.errors.length} error(s)</Badge>
                    )}
                    {!isEdit && (
                      <Badge variant="secondary">Questions will be saved with the test</Badge>
                    )}
                  </div>
                  {csvPreview.errors.length > 0 && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 space-y-1">
                      {csvPreview.errors.map((e, i) => (
                        <p key={i} className="text-xs text-destructive">{e}</p>
                      ))}
                    </div>
                  )}
                  {csvPreview.rows.length > 0 && (
                    <div className="border border-border rounded-md overflow-auto max-h-52">
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
                              <TableCell className="text-xs">
                                {OPTION_LETTERS[Number(r.correctAnswer) - 1] ?? r.correctAnswer}
                              </TableCell>
                              <TableCell className="text-xs">{r.marks || 1}</TableCell>
                            </TableRow>
                          ))}
                          {csvPreview.rows.length > 20 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-xs text-center text-muted-foreground">
                                …and {csvPreview.rows.length - 20} more rows
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => { setCsvPreviewOpen(false); setCsvPreview(null); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        csvPreview.rows.length === 0 ||
                        csvPreview.errors.length > 0 ||
                        (isEdit && bulkMut.isPending)
                      }
                      onClick={() => isEdit ? bulkMut.mutate(csvPreview.rows) : confirmCsvCreate()}
                    >
                      {isEdit && bulkMut.isPending
                        ? "Importing…"
                        : `Import ${csvPreview.rows.length} Questions`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            {step === 1 ? (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setStep(2)} disabled={!step1Valid}>
                  Next →
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep(1)} disabled={saveMut.isPending}>
                  ← Back
                </Button>
                <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                  {saveMut.isPending ? "Saving…" : "Save"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteQTarget}
        onOpenChange={(o) => !o && setDeleteQTarget(null)}
        onConfirm={() => deleteQTarget && deleteQLiveMut.mutate(deleteQTarget)}
        isPending={deleteQLiveMut.isPending}
        itemLabel="this question"
      />
    </>
  );
}
