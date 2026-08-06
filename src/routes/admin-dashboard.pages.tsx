import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { unwrapList } from "@/lib/api-unwrap";
import * as pageService from "@/services/pageService";
import { LoadingRows } from "@/components/admin/LoadingRows";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { AdminPager } from "@/components/admin/AdminPager";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";

// Temporarily disabled - Pages section temporarily hidden (2026-08-04).
// Route intentionally left unregistered so /admin-dashboard/pages is no
// longer reachable; TanStack Router's codegen drops it from routeTree.gen.ts
// automatically when this file has no `Route` export. Nothing else in this
// file (component, pageService calls, etc.) was touched â€” uncomment below
// to re-enable.
// export const Route = createFileRoute("/admin-dashboard/pages")({
//   component: PagesPage,
// });

const emptyForm = { slug: "", title: "", content: "", status: "draft" as "draft" | "published" };

function PagesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: pagesRes, isLoading } = useQuery({
    queryKey: ["ad-pages", statusFilter],
    queryFn: () => pageService.adminGetPages(statusFilter === "all" ? undefined : { status: statusFilter as "draft" | "published" }),
  });
  const pages = unwrapList<any>(pagesRes);

  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { search, setSearch, paginated, page, setPage, totalPages } = usePaginatedSearch(pages, ["slug", "title"]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ slug: p.slug ?? "", title: p.title ?? "", content: typeof p.content === "string" ? p.content : JSON.stringify(p.content ?? ""), status: p.status ?? "draft" });
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      if (editing) {
        const { slug, ...rest } = form;
        return pageService.updatePage(editing._id, rest);
      }
      return pageService.createPage(form);
    },
    onSuccess: () => {
      toast.success(editing ? "Page updated" : "Page created");
      qc.invalidateQueries({ queryKey: ["ad-pages"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not save page"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => pageService.deletePage(id),
    onSuccess: () => {
      toast.success("Page deleted");
      qc.invalidateQueries({ queryKey: ["ad-pages"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete page"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Pages</h2>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openCreate}>New</Button>
        </div>
      </div>
      <div className="mb-2">
        <Input
          placeholder="Search pagesâ€¦"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead>Updated By</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <LoadingRows colSpan={4} />}
          {!isLoading && paginated.map((p) => (
            <TableRow key={p._id}>
              <TableCell>{p.title}</TableCell>
              <TableCell>{p.status === "published" ? <Badge className="bg-success/15 text-success-foreground border-transparent">Published</Badge> : <Badge variant="outline">Draft</Badge>}</TableCell>
              <TableCell>{p.updatedBy?.name ?? "â€”"}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => setDeleteTarget(p._id)} disabled={deleteMut.isPending}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && pages.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No pages yet.</TableCell></TableRow>}
        </TableBody>
      </Table>
      <AdminPager page={page} totalPages={totalPages} onPageChange={setPage} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Page" : "New Page"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={!!editing} placeholder="e.g. terms-of-service" /></div>
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Content</Label><Textarea rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "draft" | "published" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.slug || !form.title}>{saveMut.isPending ? "Savingâ€¦" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget)}
        isPending={deleteMut.isPending}
        itemLabel="this page"
      />
    </div>
  );
}
