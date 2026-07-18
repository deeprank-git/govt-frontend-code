import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { unwrapList } from "@/lib/api-unwrap";
import * as mediaService from "@/services/mediaService";

export const Route = createFileRoute("/admin-dashboard/media")({
  component: MediaPage,
});

function MediaPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { data: mediaRes } = useQuery({
    queryKey: ["ad-media", typeFilter],
    queryFn: () => mediaService.getMedia(typeFilter === "all" ? undefined : { type: typeFilter }),
  });
  const media = unwrapList<any>(mediaRes);

  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const uploadMut = useMutation({
    mutationFn: (file: File) => mediaService.uploadMedia(file),
    onSuccess: () => {
      toast.success("File uploaded");
      qc.invalidateQueries({ queryKey: ["ad-media"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Upload failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => mediaService.deleteMedia(id),
    onSuccess: () => {
      toast.success("Media deleted");
      qc.invalidateQueries({ queryKey: ["ad-media"] });
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete media"),
  });

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMut.mutate(file);
    e.target.value = "";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-base font-semibold">Media</h2>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="document">Document</SelectItem>
            </SelectContent>
          </Select>
          <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected} />
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadMut.isPending}>
            <Upload className="h-4 w-4 mr-1" /> {uploadMut.isPending ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {media.map((m) => (
          <Card key={m._id} className="p-2 flex flex-col gap-2">
            <div className="h-24 rounded-md bg-muted grid place-items-center overflow-hidden">
              {m.type === "image" ? (
                <img src={mediaService.resolveMediaUrl(m.url)} alt={m.originalName} className="w-full h-full object-cover" />
              ) : (
                <FileText className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="text-[11px] truncate" title={m.originalName}>{m.originalName}</div>
            <Button size="sm" variant="outline" className="w-full" onClick={() => setDeleteId(m._id)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </Card>
        ))}
        {media.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground py-6">No media uploaded yet.</p>}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the file from storage. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMut.mutate(deleteId)} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
