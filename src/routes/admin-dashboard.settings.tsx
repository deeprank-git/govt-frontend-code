import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { unwrapItem } from "@/lib/api-unwrap";
import * as settingService from "@/services/settingService";

export const Route = createFileRoute("/admin-dashboard/settings")({
  component: SettingsPage,
});

// socialLinks is a schema-less object on the backend â€” this fixed set of
// platform keys is an assumption about which ones matter, easy to extend.
const SOCIAL_PLATFORMS = ["facebook", "twitter", "instagram", "youtube", "linkedin"] as const;

type FormState = {
  siteName: string;
  logo: string;
  contactEmail: string;
  maintenanceMode: boolean;
  socialLinks: Record<string, string>;
};

const emptyForm: FormState = {
  siteName: "",
  logo: "",
  contactEmail: "",
  maintenanceMode: false,
  socialLinks: {},
};

function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    settingService
      .getSettings()
      .then((res) => {
        const data = unwrapItem<any>(res);
        if (data) {
          setForm({
            siteName: data.siteName ?? "",
            logo: data.logo ?? "",
            contactEmail: data.contactEmail ?? "",
            maintenanceMode: !!data.maintenanceMode,
            socialLinks: data.socialLinks ?? {},
          });
        }
      })
      .catch(() => toast.error("Could not load settings"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const saveMut = useMutation({
    mutationFn: () => settingService.updateSettings(form),
    onSuccess: () => {
      toast.success("Settings updated");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not save settings"),
  });

  if (loading) {
    return (
      <div className="max-w-xl space-y-4">
        <Skeleton className="h-6 w-24" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold mb-4">Settings</h2>
      <div className="space-y-4">
        <div><Label>Site Name</Label><Input value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} disabled={loading} /></div>
        <div><Label>Logo URL</Label><Input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} disabled={loading} /></div>
        <div><Label>Contact Email</Label><Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} disabled={loading} /></div>

        <div className="flex items-center justify-between border border-border rounded-md px-4 py-3">
          <div>
            <Label>Maintenance Mode</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Editable flag only â€” nothing in the app currently enforces this.</p>
          </div>
          <Switch checked={form.maintenanceMode} onCheckedChange={(v) => setForm({ ...form, maintenanceMode: v })} disabled={loading} />
        </div>

        <div className="border-t border-border pt-4">
          <Label className="mb-2 block">Social Links</Label>
          <div className="space-y-2">
            {SOCIAL_PLATFORMS.map((platform) => (
              <div key={platform} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20 capitalize">{platform}</span>
                <Input
                  value={form.socialLinks[platform] ?? ""}
                  onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, [platform]: e.target.value } })}
                  placeholder={`https://${platform}.com/...`}
                  disabled={loading}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={() => saveMut.mutate()} disabled={loading || saveMut.isPending}>{saveMut.isPending ? "Savingâ€¦" : "Save Settings"}</Button>
          <Button variant="outline" onClick={load} disabled={loading}>Reset</Button>
        </div>
      </div>
    </div>
  );
}
