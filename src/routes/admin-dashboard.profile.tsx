import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { unwrapItem } from "@/lib/api-unwrap";
import * as userService from "@/services/userService";
import * as mediaService from "@/services/mediaService";
import { getToken, getUser, setAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/admin-dashboard/profile")({
  component: AdminProfilePage,
});

type FormState = {
  name: string;
  email: string;
  username: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  picture: string;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  username: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  picture: "",
};

function AdminProfilePage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    userService
      .getMe()
      .then((res) => {
        const data = unwrapItem<any>(res);
        if (data) {
          setForm((f) => ({
            ...f,
            name: data.name ?? "",
            email: data.email ?? "",
            username: data.username ?? "",
            phone: data.phone ?? "",
            address: data.address ?? "",
            city: data.city ?? "",
            country: data.country ?? "",
            picture: data.picture ?? "",
          }));
        }
      })
      .catch(() => toast.error("Could not load profile"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const uploadMut = useMutation({
    mutationFn: (file: File) => mediaService.uploadMedia(file),
    onSuccess: (res) => {
      const media = unwrapItem<any>(res);
      const url = media?.url ? mediaService.resolveMediaUrl(media.url) : "";
      if (url) setForm((f) => ({ ...f, picture: url }));
      toast.success("Picture uploaded — save changes to keep it, though it won't persist across logins until the backend supports it (see note below).");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not upload picture"),
  });

  const saveMut = useMutation({
    mutationFn: () => userService.updateMe(form),
    onSuccess: (res) => {
      const updated = unwrapItem<any>(res);
      const token = getToken();
      const current = getUser();
      if (updated && token && current) {
        setAuth(token, { ...current, name: updated.name ?? current.name, email: updated.email ?? current.email });
      }
      toast.success("Profile updated (name & email saved; see note below for other fields)");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not update profile"),
  });

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) uploadMut.mutate(file);
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-6 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-base font-semibold mb-1">Profile Settings</h2>
      <p className="text-sm text-muted-foreground mb-4">Manage your personal admin account details.</p>

      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground mb-4">
        Name and email save immediately. Profile picture, username, phone, address, city, and country are
        captured here but the backend doesn't store them yet — they'll reset on reload until that's added
        (see report).
      </div>

      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-16 w-16">
          {form.picture ? <AvatarImage src={form.picture} alt={form.name} /> : null}
          <AvatarFallback className="text-lg">{(form.name || form.email || "A").slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadMut.isPending}>
            {uploadMut.isPending ? "Uploading…" : "Change Picture"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. admin_jane" /></div>
          <div><Label>Phone Number</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +91 98765 43210" /></div>
        </div>
        <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>{saveMut.isPending ? "Saving…" : "Save Changes"}</Button>
          <Button variant="outline" onClick={load}>Reset</Button>
        </div>
      </div>
    </div>
  );
}
