import { createFileRoute } from "@tanstack/react-router";
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
import { Plus, X } from "lucide-react";
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
  component: TestSeriesPage,
});

const emptySeriesForm = {
  name: "", description: "", category: "",
  isPublished: false, isPaid: false, price: 0,
  negativeMarking: false, negativeMarksPerQuestion: 0, marksPerQuestion: 1,
};

function TestSeriesPage() {
  const { data: categoriesRes } = useQuery({ queryKey: ["ad-categories"], queryFn: () => categoryService.getCategories() });
  const categories = unwrapList<any>(categoriesRes);
  const { data: seriesRes, isLoading } = useQuery({ queryKey: ["ad-series"], queryFn: () => testSeriesService.getTestSeries() });
  const series = unwrapList<any>(seriesRes);

  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptySeriesForm);
  const [importantDates, setImportantDates] = useState<{ label: string; from: string; to: string }[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [notificationPdfFile, setNotificationPdfFile] = useState<File | null>(null);
  const [existingNotificationPdf, setExistingNotificationPdf] = useState("");
  const notificationPdfInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { search, setSearch, paginated, page, setPage, totalPages } = usePaginatedSearch(series, ["name", "description"]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptySeriesForm, category: categories[0]?._id ?? "" });
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
      Object.entries(s.importantDates ?? {}).map(([label, value]: [string, any]) => ({
        label,
        from: value?.from ?? "",
        to: value?.to ?? "",
      })),
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
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Test Series</h2>
        <Button size="sm" onClick={openCreate}>New</Button>
      </div>
      <div className="mb-2">
        <Input
          placeholder="Search test series"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Total Tests</TableHead><TableHead>Published</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <LoadingRows colSpan={5} />}
          {!isLoading && paginated.map((s) => (
            <TableRow key={s._id}>
              <TableCell>{s.name}</TableCell>
              <TableCell>{s.category?.name ?? "—"}</TableCell>
              <TableCell>{s.totalTests ?? 0}</TableCell>
              <TableCell>{s.isPublished ? "Published" : "Draft"}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => togglePublishMut.mutate(s)}
                  disabled={togglePublishMut.isPending}
                >
                  {s.isPublished ? "Unpublish" : "Publish"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(s)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => setDeleteTarget(s._id)} disabled={deleteMut.isPending}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && series.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No test series yet.</TableCell></TableRow>}
        </TableBody>
      </Table>
      <AdminPager page={page} totalPages={totalPages} onPageChange={setPage} />

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
                <SelectContent>{categories.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
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
                  onClick={() => setImportantDates([...importantDates, { label: "", from: "", to: "" }])}
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
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        title="From"
                        className="flex-1"
                        value={d.from}
                        onChange={(e) => setImportantDates(importantDates.map((x, xi) => xi === i ? { ...x, from: e.target.value } : x))}
                      />
                      <span className="text-xs text-muted-foreground shrink-0">to</span>
                      <Input
                        type="date"
                        title="To (optional — leave blank for a single date)"
                        className="flex-1"
                        value={d.to}
                        onChange={(e) => setImportantDates(importantDates.map((x, xi) => xi === i ? { ...x, to: e.target.value } : x))}
                      />
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
