import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { unwrapList } from "@/lib/api-unwrap";
import * as categoryService from "@/services/categoryService";
import * as testSeriesService from "@/services/testSeriesService";
import * as testService from "@/services/testService";
import { LoadingRows } from "@/components/admin/LoadingRows";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { AdminPager } from "@/components/admin/AdminPager";
import { TestWizardDialog } from "@/components/admin/TestWizardDialog";
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
  const tests = unwrapList<any>(testsRes).filter((t: any) => t.isActive !== false);

  const qc = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { search, setSearch, paginated, page, setPage, totalPages } = usePaginatedSearch(tests, ["title"]);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkResults, setBulkResults] = useState<{ name: string; status: "success" | "error"; message?: string }[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = ["title", "category", "testSeries", "duration", "isPublished", "isPaid", "marksPerQuestion", "negativeMarking", "negativeMarksPerQuestion"];
    const rows = [
      ["Sample Mock Test", "General Studies", "GS Mock Series", "60", "true", "false", "1", "false", "0"],
      ["Premium Current Affairs Test", "Current Affairs", "CA Series", "45", "false", "true", "2", "true", "0.5"],
    ];
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tests-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    };
    const lines = text.trim().split(/\r?\n/);
    const headers = parseCSVLine(lines[0]);
    return lines.slice(1).filter((l) => l.trim()).map((line) => {
      const values = parseCSVLine(line);
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
    });
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;
    setBulkUploading(true);
    setBulkResults([]);
    const text = await bulkFile.text();
    const rows = parseCSV(text);
    const results: { name: string; status: "success" | "error"; message?: string }[] = [];
    for (const row of rows) {
      const cat = categories.find((c: any) => c.name.toLowerCase() === (row.category ?? "").toLowerCase());
      if (!cat) {
        results.push({ name: row.title || "Unknown", status: "error", message: `Category "${row.category}" not found` });
        continue;
      }
      const ser = row.testSeries?.trim()
        ? series.find((s: any) => s.name.toLowerCase() === row.testSeries.toLowerCase())
        : null;
      if (row.testSeries?.trim() && !ser) {
        results.push({ name: row.title || "Unknown", status: "error", message: `Test series "${row.testSeries}" not found` });
        continue;
      }
      try {
        await testService.createTest({
          title: row.title,
          category: cat._id,
          testSeries: ser?._id ?? undefined,
          duration: Number(row.duration) || 60,
          isPublished: row.isPublished === "true",
          isPaid: row.isPaid === "true",
          marksPerQuestion: Number(row.marksPerQuestion) || 1,
          negativeMarking: row.negativeMarking === "true",
          negativeMarksPerQuestion: Number(row.negativeMarksPerQuestion) || 0,
        });
        results.push({ name: row.title, status: "success" });
      } catch (err: any) {
        results.push({ name: row.title, status: "error", message: err?.response?.data?.message ?? "Failed to create" });
      }
    }
    setBulkResults(results);
    setBulkUploading(false);
    qc.invalidateQueries({ queryKey: ["ad-tests"] });
  };

  const openCreate = () => { setEditingTest(null); setWizardOpen(true); };
  const openEdit = (t: any) => { setEditingTest(t); setWizardOpen(true); };

  const deleteMut = useMutation({
    mutationFn: (id: string) => testService.deleteTest(id),
    onSuccess: () => {
      toast.success("Test deleted");
      qc.invalidateQueries({ queryKey: ["ad-tests"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete test"),
  });

  const togglePublishMut = useMutation({
    mutationFn: (t: any) => testService.updateTest(t._id, { isPublished: !t.isPublished }),
    onSuccess: (_data, t) => {
      toast.success(t.isPublished ? "Test unpublished" : "Test published");
      qc.invalidateQueries({ queryKey: ["ad-tests"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not update publish status"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Tests</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { setBulkFile(null); setBulkResults([]); setBulkOpen(true); }}>
            <Upload className="h-3.5 w-3.5 mr-1" /> Bulk Upload
          </Button>
          <Button size="sm" onClick={openCreate}>New</Button>
        </div>
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
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Qs</TableHead>
            <TableHead>Marks</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Published</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => togglePublishMut.mutate(t)}
                  disabled={togglePublishMut.isPending}
                >
                  {t.isPublished ? "Unpublish" : "Publish"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(t)}>Edit</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteTarget(t._id)}
                  disabled={deleteMut.isPending}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && tests.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                No tests yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <AdminPager page={page} totalPages={totalPages} onPageChange={setPage} />

      <TestWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        editingTest={editingTest}
        categories={categories}
        series={series}
        onSaved={() => qc.invalidateQueries({ queryKey: ["ad-tests"] })}
      />

      <Dialog open={bulkOpen} onOpenChange={(o) => { if (!bulkUploading) { setBulkOpen(o); if (!o) { setBulkFile(null); setBulkResults([]); } } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Bulk Upload Tests</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1">
              <p className="text-sm font-medium">CSV Format</p>
              <p className="text-xs text-muted-foreground">Columns: title, category, testSeries, duration, isPublished, isPaid, marksPerQuestion, negativeMarking, negativeMarksPerQuestion</p>
              <p className="text-xs text-muted-foreground">Use exact category and test series names. Booleans: <code className="font-mono">true</code> / <code className="font-mono">false</code>. Leave <code className="font-mono">testSeries</code> blank if not applicable.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5 mr-1" /> Download Template
            </Button>
            <div>
              <Label>Upload CSV</Label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { setBulkFile(f); setBulkResults([]); } }}
                />
                <Button type="button" size="sm" variant="outline" onClick={() => bulkFileInputRef.current?.click()}>
                  {bulkFile ? "Replace File" : "Choose CSV"}
                </Button>
                {bulkFile && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{bulkFile.name}</span>}
              </div>
            </div>
            {bulkResults.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Results ({bulkResults.filter(r => r.status === "success").length}/{bulkResults.length} succeeded)</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {bulkResults.map((r, i) => (
                    <div key={i} className={`flex items-start gap-2 rounded px-2 py-1 text-xs ${r.status === "success" ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
                      <span className="font-medium shrink-0">{r.status === "success" ? "✓" : "✗"}</span>
                      <span>{r.name}{r.message ? ` — ${r.message}` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkOpen(false); setBulkFile(null); setBulkResults([]); }} disabled={bulkUploading}>Cancel</Button>
            <Button onClick={handleBulkUpload} disabled={!bulkFile || bulkUploading}>
              {bulkUploading ? "Uploading…" : "Upload"}
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
