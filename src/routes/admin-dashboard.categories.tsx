import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { unwrapList } from "@/lib/api-unwrap";
import * as categoryService from "@/services/categoryService";

export const Route = createFileRoute("/admin-dashboard/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: categoriesRes } = useQuery({ queryKey: ["ad-categories"], queryFn: () => categoryService.getCategories() });
  const categories = unwrapList<any>(categoriesRes);

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
      qc.invalidateQueries({ queryKey: ["ad-categories"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not save category"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["ad-categories"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete category"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold">Categories</h2>
        <Button size="sm" onClick={openCreate}>New</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((c) => (
            <TableRow key={c._id}>
              <TableCell>{c.name}</TableCell>
              <TableCell>{c.slug}</TableCell>
              <TableCell className="max-w-xs truncate">{c.description || "—"}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => deleteMut.mutate(c._id)} disabled={deleteMut.isPending}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
          {categories.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No categories yet.</TableCell></TableRow>}
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
    </div>
  );
}
