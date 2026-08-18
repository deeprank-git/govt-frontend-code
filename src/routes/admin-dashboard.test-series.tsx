import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, X, Download, Upload, ChevronRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { unwrapList } from "@/lib/api-unwrap";
import * as categoryService from "@/services/categoryService";
import * as testSeriesService from "@/services/testSeriesService";
import * as mediaService from "@/services/mediaService";
import { LoadingRows } from "@/components/admin/LoadingRows";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { AdminPager } from "@/components/admin/AdminPager";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";

export const Route = createFileRoute("/admin-dashboard/test-series")({
  validateSearch: (search: Record<string, unknown>) => ({
    categoryId: typeof search.categoryId === "string" ? search.categoryId : undefined,
    categoryName: typeof search.categoryName === "string" ? search.categoryName : undefined,
  }),
  component: TestSeriesPage,
});

const emptySeriesForm = {
  name: "", description: "", category: "",
  isPublished: false, isPaid: false, price: 0,
  negativeMarking: false, negativeMarksPerQuestion: 0, marksPerQuestion: 1,
};

function TestSeriesPage() {
  const { categoryId, categoryName } = Route.useSearch();
  const navigate = useNavigate();

  // Two levels: categories → series
  const showCategories = !categoryId;
  const showSeries = !!categoryId;

  const { data: categoriesRes, isLoading: catsLoading } = useQuery({ queryKey: ["ad-categories"], queryFn: () => categoryService.getCategories() });
  const categories = unwrapList<any>(categoriesRes).filter((c: any) => c.isActive !== false);

  const { data: seriesRes, isLoading: seriesLoading } = useQuery({ queryKey: ["ad-series"], queryFn: () => testSeriesService.getTestSeries() });
  const allSeries = unwrapList<any>(seriesRes).filter((s: any) => s.isActive !== false);
  const filteredSeries = categoryId
    ? allSeries.filter((s: any) => (s.category?._id ?? s.category) === categoryId)
    : allSeries;

  const isLoading = showCategories ? catsLoading : seriesLoading;

  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptySeriesForm);
  const [importantDates, setImportantDates] = useState<{ label: string; from: string; to: string; isSingleDate: boolean }[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [notificationPdfFile, setNotificationPdfFile] = useState<File | null>(null);
  const [existingNotificationPdf, setExistingNotificationPdf] = useState("");
  const notificationPdfInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { search, setSearch, paginated, page, setPage, totalPages } = usePaginatedSearch(
    showSeries ? filteredSeries : categories,
    ["name", "description"],
  );

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkResults, setBulkResults] = useState<{ name: string; status: "success" | "error"; message?: string }[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = ["name", "description", "category", "isPublished", "isPaid", "price", "marksPerQuestion", "negativeMarking", "negativeMarksPerQuestion", "importantDates"];
    const rows = [
      ["Sample Test Series", "A free published test series", "General Studies", "true", "false", "0", "1", "false", "0", "examDate:2025-03-15"],
      ["Premium Mock Test", "A paid series with negative marking", "Current Affairs", "false", "true", "299", "2", "true", "0.5", "applicationDate:2025-01-01:2025-01-31;examDate:2025-03-20"],
    ];
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test-series-template.csv";
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
        results.push({ name: row.name || "Unknown", status: "error", message: `Category "${row.category}" not found` });
        continue;
      }
      try {
        const parsedDates: Record<string, { from: string; to: string }> = {};
        if (row.importantDates?.trim()) {
          for (const entry of row.importantDates.split(";")) {
            const parts = entry.trim().split(":");
            if (parts.length >= 2) {
              const label = parts[0].trim();
              const from = parts[1].trim();
              const to = parts[2]?.trim() || from;
              if (label && from) parsedDates[label] = { from, to };
            }
          }
        }
        await testSeriesService.createTestSeries({
          name: row.name,
          description: row.description ?? "",
          category: cat._id,
          isPublished: row.isPublished === "true",
          isPaid: row.isPaid === "true",
          price: Number(row.price) || 0,
          marksPerQuestion: Number(row.marksPerQuestion) || 1,
          negativeMarking: row.negativeMarking === "true",
          negativeMarksPerQuestion: Number(row.negativeMarksPerQuestion) || 0,
          importantDates: Object.keys(parsedDates).length ? parsedDates : undefined,
        });
        results.push({ name: row.name, status: "success" });
      } catch (err: any) {
        results.push({ name: row.name, status: "error", message: err?.response?.data?.message ?? "Failed to create" });
      }
    }
    setBulkResults(results);
    setBulkUploading(false);
    qc.invalidateQueries({ queryKey: ["ad-series"] });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptySeriesForm, category: categoryId ?? categories[0]?._id ?? "" });
    setImportantDates([]);
    setImageFile(null);
    setExistingImage("");
    setNotificationPdfFile(null);
    setExistingNotificationPdf("");
    setOpen(true);
  };
  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      name: s.name ?? "",
      description: s.description ?? "",
      category: s.category?._id ?? s.category ?? "",
      isPublished: !!s.isPublished,
      isPaid: !!s.isPaid,
      price: s.price ?? 0,
      negativeMarking: !!s.negativeMarking,
      negativeMarksPerQuestion: s.negativeMarksPerQuestion ?? 0,
      marksPerQuestion: s.marksPerQuestion ?? 1,
    });
    setImportantDates(
      Object.entries(s.importantDates ?? {}).map(([label, value]: [string, any]) => {
        const from = value?.from ?? "";
        const to = value?.to ?? "";
        return { label, from, to, isSingleDate: !to || to === from };
      }),
    );
    setImageFile(null);
    setExistingImage(s.image ?? "");
    setNotificationPdfFile(null);
    setExistingNotificationPdf(s.notificationPdf ?? "");
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload: testSeriesService.TestSeriesInput = {
        ...form,
        importantDates: importantDates.length
          ? Object.fromEntries(
              importantDates
                .filter((d) => d.label.trim() && d.from)
                .map((d) => [d.label, { from: d.from, to: d.to || d.from }]),
            )
          : undefined,
        image: imageFile ?? undefined,
        notificationPdf: notificationPdfFile ?? undefined,
      };
      return editing ? testSeriesService.updateTestSeries(editing._id, payload) : testSeriesService.createTestSeries(payload);
    },
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
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete test series"),
  });

  const togglePublishMut = useMutation({
    mutationFn: (s: any) => testSeriesService.updateTestSeries(s._id, { isPublished: !s.isPublished }),
    onSuccess: (_data, s) => {
      toast.success(s.isPublished ? "Test series unpublished" : "Test series published");
      qc.invalidateQueries({ queryKey: ["ad-series"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not update publish status"),
  });

  return (
    <div>
      {/* Breadcrumb — only in series view */}
      {showSeries && categoryName && (
        <div className="flex items-center gap-1.5 mb-3 text-sm text-muted-foreground">
          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={() => navigate({ to: "/admin-dashboard/test-series" })}>
            <ArrowLeft className="h-3.5 w-3.5" /> Categories
          </Button>
          <span>/</span>
          <span className="font-medium text-foreground">{categoryName}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gradient-primary">Test Series</h2>
        {showSeries && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { setBulkFile(null); setBulkResults([]); setBulkOpen(true); }}>
              <Upload className="h-3.5 w-3.5 mr-1" /> Bulk Upload
            </Button>
            <Button size="sm" onClick={openCreate}>New</Button>
          </div>
        )}
      </div>
      <div className="mb-2">
        <Input
          placeholder={showSeries ? "Search test series…" : "Search categories…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Categories table */}
      {showCategories && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <LoadingRows colSpan={2} />}
            {!isLoading && paginated.map((c: any) => (
              <TableRow key={c._id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-primary gap-1"
                    onClick={() => navigate({ to: "/admin-dashboard/test-series", search: { categoryId: c._id, categoryName: c.name } })}
                  >
                    Series <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-6">No categories yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* Test Series table */}
      {showSeries && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Total Tests</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <LoadingRows colSpan={4} />}
            {!isLoading && paginated.map((s: any) => (
              <TableRow key={s._id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.totalTests ?? 0}</TableCell>
                <TableCell>{s.isPublished ? "Published" : "Draft"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-primary gap-1"
                    onClick={() => navigate({ to: "/admin-dashboard/tests", search: { categoryId: categoryId ?? undefined, categoryName: categoryName ?? undefined, seriesId: s._id, seriesName: s.name } as any })}
                  >
                    Tests <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => togglePublishMut.mutate(s)} disabled={togglePublishMut.isPending}>
                    {s.isPublished ? "Unpublish" : "Publish"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(s)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleteTarget(s._id)} disabled={deleteMut.isPending}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && filteredSeries.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No test series in this category yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <AdminPager page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Create/Edit dialog — only in series view */}
      {showSeries && (
        <>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Edit Test Series" : "New Test Series"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map((c: any) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Image</Label>
                  <div className="flex items-center gap-3 mt-1">
                    {(imageFile || existingImage) && (
                      <img
                        src={imageFile ? URL.createObjectURL(imageFile) : mediaService.resolveMediaUrl(existingImage)}
                        alt=""
                        className="h-14 w-14 rounded-md object-cover border border-border"
                      />
                    )}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setImageFile(f); }}
                    />
                    <Button type="button" size="sm" variant="outline" onClick={() => imageInputRef.current?.click()}>
                      {imageFile || existingImage ? "Replace Image" : "Upload Image"}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Notification PDF</Label>
                  <div className="flex items-center gap-3 mt-1">
                    {(notificationPdfFile || existingNotificationPdf) && (
                      <a
                        href={notificationPdfFile ? URL.createObjectURL(notificationPdfFile) : mediaService.resolveMediaUrl(existingNotificationPdf)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline truncate max-w-[160px]"
                      >
                        {notificationPdfFile ? notificationPdfFile.name : "View current PDF"}
                      </a>
                    )}
                    <input
                      ref={notificationPdfInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setNotificationPdfFile(f); }}
                    />
                    <Button type="button" size="sm" variant="outline" onClick={() => notificationPdfInputRef.current?.click()}>
                      {notificationPdfFile || existingNotificationPdf ? "Replace PDF" : "Upload PDF"}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between"><Label>Published</Label><Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} /></div>
                <div className="flex items-center justify-between"><Label>Paid</Label><Switch checked={form.isPaid} onCheckedChange={(v) => setForm({ ...form, isPaid: v })} /></div>
                {form.isPaid && <div><Label>Price</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>}

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div><Label>Marks per Question</Label><Input type="number" value={form.marksPerQuestion} onChange={(e) => setForm({ ...form, marksPerQuestion: Number(e.target.value) })} /></div>
                  <div className="flex items-center justify-between self-end pb-2"><Label>Negative Marking</Label><Switch checked={form.negativeMarking} onCheckedChange={(v) => setForm({ ...form, negativeMarking: v })} /></div>
                </div>
                {form.negativeMarking && (
                  <div><Label>Negative Marks per Question</Label><Input type="number" value={form.negativeMarksPerQuestion} onChange={(e) => setForm({ ...form, negativeMarksPerQuestion: Number(e.target.value) })} /></div>
                )}

                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <Label>Important Dates</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setImportantDates([...importantDates, { label: "", from: "", to: "", isSingleDate: true }])}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Date
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {importantDates.map((d, i) => (
                      <div key={i} className="rounded-md border border-border p-2.5 space-y-2">
                        <Input
                          placeholder="e.g. examDate"
                          value={d.label}
                          onChange={(e) => setImportantDates(importantDates.map((x, xi) => xi === i ? { ...x, label: e.target.value } : x))}
                        />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Switch
                            checked={!d.isSingleDate}
                            onCheckedChange={(v) =>
                              setImportantDates(importantDates.map((x, xi) =>
                                xi === i ? { ...x, isSingleDate: !v, to: !v ? x.from : x.to } : x
                              ))
                            }
                          />
                          <span>{d.isSingleDate ? "Single date" : "Date range"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="date"
                            title={d.isSingleDate ? "Date" : "From"}
                            className="flex-1"
                            value={d.from}
                            onChange={(e) =>
                              setImportantDates(importantDates.map((x, xi) =>
                                xi === i ? { ...x, from: e.target.value, to: x.isSingleDate ? e.target.value : x.to } : x
                              ))
                            }
                          />
                          {!d.isSingleDate && (
                            <>
                              <span className="text-xs text-muted-foreground shrink-0">to</span>
                              <Input
                                type="date"
                                title="To"
                                className="flex-1"
                                value={d.to}
                                onChange={(e) => setImportantDates(importantDates.map((x, xi) => xi === i ? { ...x, to: e.target.value } : x))}
                              />
                            </>
                          )}
                          <Button type="button" size="icon" variant="ghost" className="shrink-0" onClick={() => setImportantDates(importantDates.filter((_, xi) => xi !== i))}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {importantDates.length === 0 && <p className="text-xs text-muted-foreground">No dates added yet.</p>}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.name || !form.category}>{saveMut.isPending ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={bulkOpen} onOpenChange={(o) => { if (!bulkUploading) { setBulkOpen(o); if (!o) { setBulkFile(null); setBulkResults([]); } } }}>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Bulk Upload Test Series</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1">
                  <p className="text-sm font-medium">CSV Format</p>
                  <p className="text-xs text-muted-foreground">Columns: name, description, category, isPublished, isPaid, price, marksPerQuestion, negativeMarking, negativeMarksPerQuestion, importantDates</p>
                  <p className="text-xs text-muted-foreground">Use exact category names. Booleans: <code className="font-mono">true</code> / <code className="font-mono">false</code>.</p>
                  <p className="text-xs text-muted-foreground"><span className="font-medium">importantDates</span> format — single date: <code className="font-mono">label:YYYY-MM-DD</code>, range: <code className="font-mono">label:from:to</code>, multiple separated by <code className="font-mono">;</code> (e.g. <code className="font-mono">examDate:2025-03-15;appDate:2025-01-01:2025-01-31</code>)</p>
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
        </>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget)}
        isPending={deleteMut.isPending}
        itemLabel="this test series"
      />
    </div>
  );
}
