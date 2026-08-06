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
  mobile: string;
  address: string;
  city: string;
  country: string;
  profilePicture: string;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  username: "",
  mobile: "",
  address: "",
  city: "",
  country: "",
  profilePicture: "",
};

function AdminProfilePage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
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
            mobile: data.mobile ?? "",
            address: data.address ?? "",
            city: data.city ?? "",
            country: data.country ?? "",
            profilePicture: data.profilePicture ?? "",
          }));
        }
      })
      .catch(() => toast.error("Could not load profile"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const avatarSrc = pictureFile
    ? URL.createObjectURL(pictureFile)
    : form.profilePicture
      ? mediaService.resolveMediaUrl(form.profilePicture)
      : undefined;

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setPictureFile(file);
  };

  const saveMut = useMutation({
    mutationFn: () =>
      userService.updateMe({
        name: form.name,
        email: form.email,
        username: form.username,
        mobile: form.mobile,
        address: form.address,
        city: form.city,
        country: form.country,
        profilePicture: pictureFile ?? undefined,
      }),
    onSuccess: (res) => {
      const updated = unwrapItem<any>(res);
      if (updated) {
        setForm((f) => ({ ...f, ...updated, profilePicture: updated.profilePicture ?? f.profilePicture }));
        setPictureFile(null);
        const token = getToken();
        const current = getUser();
        if (token && current) {
          setAuth(token, {
            ...current,
            name: updated.name ?? current.name,
            email: updated.email ?? current.email,
            mobile: updated.mobile ?? current.mobile,
            username: updated.username ?? current.username,
            profilePicture: updated.profilePicture ?? current.profilePicture,
          });
        }
      }
      toast.success("Profile updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not update profile"),
  });

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
      <h2 className="text-lg font-semibold mb-1">Profile Settings</h2>
      <p className="text-sm text-muted-foreground mb-4">Manage your personal admin account details.</p>

      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-16 w-16">
          {avatarSrc && <AvatarImage src={avatarSrc} alt={form.name} />}
          <AvatarFallback className="text-lg">{(form.name || form.email || "A").slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            Change Picture
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
          <div><Label>Mobile Number</Label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="e.g. +91 98765 43210" /></div>
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
