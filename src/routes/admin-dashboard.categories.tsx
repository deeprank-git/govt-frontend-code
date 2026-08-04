import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { unwrapList, unwrapItem } from "@/lib/api-unwrap";
import * as categoryService from "@/services/categoryService";
import { LoadingRows } from "@/components/admin/LoadingRows";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { AdminPager } from "@/components/admin/AdminPager";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";

export const Route = createFileRoute("/admin-dashboard/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: categoriesRes, isLoading } = useQuery({ queryKey: ["ad-categories"], queryFn: () => categoryService.getCategories() });
  const categories = unwrapList<any>(categoriesRes);

  // GET /api/categories (the list above) intentionally omits `description` —
  // only GET /api/categories/:id returns the full doc. Fan out one detail
  // fetch per row so the table and edit modal show the real saved text
  // instead of always "—"/empty.
  const detailQueries = useQueries({
    queries: categories.map((c) => ({
      queryKey: ["ad-category-detail", c._id],
      queryFn: () => categoryService.getCategoryById(c._id),
      enabled: !!c._id,
    })),
  });
  const enrichedCategories = categories.map((c, i) => {
    const detail = unwrapItem<any>(detailQueries[i]?.data);
    return {
      ...c,
      description: detail?.description ?? c.description,
      _descriptionLoading: detailQueries[i]?.isLoading && detail === null,
    };
  });

  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", image: "" });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);

  const { search, setSearch, paginated, page, setPage, totalPages } = usePaginatedSearch(enrichedCategories, ["name", "description"]);

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "", image: "" }); setOpen(true); };

  // Never trust the trimmed list row for description — always fetch the
  // full record fresh so the modal doesn't briefly (or permanently) show an
  // empty field for a category that does have a saved description.
  const openEdit = async (c: any) => {
    setEditLoadingId(c._id);
    try {
      const res = await categoryService.getCategoryById(c._id);
      const full = unwrapItem<any>(res) ?? c;
      setEditing(full);
      setForm({ name: full.name ?? "", description: full.description ?? "", image: full.image ?? "" });
      setOpen(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not load category details");
    } finally {
      setEditLoadingId(null);
    }
  };

  const saveMut = useMutation({
    mutationFn: () => (editing ? categoryService.updateCategory(editing._id, form) : categoryService.createCategory(form)),
    onSuccess: () => {
      toast.success(editing ? "Category updated" : "Category created");
      qc.invalidateQueries({ queryKey: ["ad-categories"] });
      // Partial key match invalidates every ["ad-category-detail", id] entry,
      // so both the table and any reopened edit modal refetch fresh data.
      qc.invalidateQueries({ queryKey: ["ad-category-detail"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not save category"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["ad-categories"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete category"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold">Categories</h2>
        <Button size="sm" onClick={openCreate}>New</Button>
      </div>
      <div className="mb-2">
        <Input
          placeholder="Search categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <LoadingRows colSpan={3} />}
          {!isLoading && paginated.map((c) => (
            <TableRow key={c._id}>
              <TableCell>{c.name}</TableCell>
              <TableCell className="max-w-xs truncate">{c._descriptionLoading ? "…" : (c.description || "—")}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(c)} disabled={editLoadingId === c._id}>
                  {editLoadingId === c._id ? "Loading…" : "Edit"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDeleteTarget(c._id)} disabled={deleteMut.isPending}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && categories.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">No categories yet.</TableCell></TableRow>}
        </TableBody>
      </Table>
      <AdminPager page={page} totalPages={totalPages} onPageChange={setPage} />

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

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget)}
        isPending={deleteMut.isPending}
        itemLabel="this category"
      />
    </div>
  );
}
