import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { unwrapList } from "@/lib/api-unwrap";
import * as currentAffairsService from "@/services/currentAffairsService";

export const Route = createFileRoute("/admin-dashboard/current-affairs")({
  component: CurrentAffairsPage,
});

const emptyForm = {
  title: "",
  summary: "",
  content: "",
  date: new Date().toISOString().slice(0, 10),
  category: "",
  tags: "",
  image: "",
  isPublished: false,
};

function CurrentAffairsPage() {
  const { data: caRes } = useQuery({ queryKey: ["ad-current-affairs"], queryFn: () => currentAffairsService.getCurrentAffairs({ limit: 200 }) });
  const items = unwrapList<any>(caRes);

  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      title: c.title ?? "",
      summary: c.summary ?? "",
      content: c.content ?? "",
      date: c.date ? new Date(c.date).toISOString().slice(0, 10) : emptyForm.date,
      category: c.category ?? "",
      tags: (c.tags ?? []).join(", "),
      image: c.image ?? "",
      isPublished: !!c.isPublished,
    });
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      return editing ? currentAffairsService.updateCurrentAffair(editing._id, payload) : currentAffairsService.createCurrentAffair(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Article updated" : "Article created");
      qc.invalidateQueries({ queryKey: ["ad-current-affairs"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not save article"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => currentAffairsService.deleteCurrentAffair(id),
    onSuccess: () => {
      toast.success("Article deleted");
      qc.invalidateQueries({ queryKey: ["ad-current-affairs"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete article"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold">Current Affairs</h2>
        <Button size="sm" onClick={openCreate}>New</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Published</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((c) => {
            const deleted = !c.isActive;
            return (
              <TableRow key={c._id}>
                <TableCell className="max-w-xs truncate">{c.title}</TableCell>
                <TableCell>{c.category}</TableCell>
                <TableCell>{new Date(c.date).toLocaleDateString()}</TableCell>
                <TableCell>{c.isPublished ? "Published" : "Draft"}</TableCell>
                <TableCell>{c.views ?? 0}</TableCell>
                <TableCell>{deleted ? <Badge variant="destructive">Deleted</Badge> : <Badge variant="outline">Active</Badge>}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)} disabled={deleted}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => deleteMut.mutate(c._id)} disabled={deleted || deleteMut.isPending}>Delete</Button>
                </TableCell>
              </TableRow>
            );
          })}
          {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No articles yet.</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Article" : "New Article"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Summary</Label><Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
            <div><Label>Content</Label><Textarea rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Polity" /></div>
            </div>
            <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
            <div><Label>Image URL</Label><Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></div>
            <div className="flex items-center justify-between"><Label>Published</Label><Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.title || !form.content}>{saveMut.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
