import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import * as userService from "@/services/userService";
import { unwrapItem } from "@/lib/api-unwrap";
import { setAuth, clearAuth, getToken } from "@/lib/auth-store";
import { toast } from "sonner";
import {
  Settings,
  CheckCircle2,
  Bell,
  Lock,
  KeyRound,
  Trash2,
  ChevronRight,
  Info,
  Headphones,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  component: ProfilePage,
});

const TABS = ["Profile Information", "Notification Settings", "Privacy & Security", "Account Settings"] as const;

function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ name?: string; email?: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Profile Information");
  const [pwdOpen, setPwdOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    userService
      .getMe()
      .then((res) => setProfile(unwrapItem(res) ?? {}))
      .catch(() => toast.error("Could not load profile"))
      .finally(() => setLoading(false));
  }, []);

  const completion = (profile.name ? 50 : 0) + (profile.email ? 50 : 0);

  const save = async () => {
    setSaving(true);
    try {
      const res = await userService.updateMe({ name: profile.name, email: profile.email });
      const updated = unwrapItem<any>(res);
      if (updated) {
        const token = getToken();
        if (token) setAuth(token, { ...updated, id: updated.id ?? updated._id });
      }
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6"
    >
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-extrabold tracking-tight">Profile Settings</h1>
            <Settings className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your profile, preferences and account settings
          </p>
        </div>

        <div className="border-b border-border">
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {TABS.map((t) => {
              const active = activeTab === t;
              return (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`relative pb-3 text-sm font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                  {active && (
                    <motion.div
                      layoutId="profile-tab-underline"
                      className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "Profile Information" && (
          <>
            <Card className="p-6 shadow-sm">
              <h3 className="font-display font-bold text-base mb-5">Personal Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
                <div className="flex md:block justify-center">
                  <Avatar className="h-28 w-28 ring-1 ring-border">
                    <AvatarFallback className="bg-muted text-foreground text-xl font-display font-bold">
                      {(profile.name ?? profile.email ?? "U").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Full Name</Label>
                    <Input
                      value={profile.name ?? ""}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="Your full name"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Email Address</Label>
                    <div className="relative">
                      <Input
                        value={profile.email ?? ""}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="pr-24"
                        disabled={loading}
                      />
                      <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-success/15 text-success border-0 hover:bg-success/15 text-[10px] gap-1 px-2">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </Badge>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex justify-end">
                    <Button onClick={save} disabled={saving || loading} className="px-6">
                      {saving ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-sm">
              <h3 className="font-display font-bold text-base mb-5">Quick Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <QuickCard
                  icon={Bell}
                  iconBg="bg-purple-50 text-purple-600"
                  title="Notification Settings"
                  desc="Manage how you receive alerts and updates."
                  onClick={() => setActiveTab("Notification Settings")}
                />
                <QuickCard
                  icon={KeyRound}
                  iconBg="bg-orange-50 text-orange-600"
                  title="Change Password"
                  desc="Update your password regularly for security."
                  onClick={() => setPwdOpen(true)}
                />
              </div>
            </Card>

            <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <Info className="h-5 w-5 text-primary flex-none mt-0.5" />
              <p className="text-sm">
                <span className="font-semibold">Note:</span>{" "}
                <span className="text-muted-foreground">
                  Only name, email and password are stored on your account. Other preferences shown
                  here are local to this screen for now.
                </span>
              </p>
            </div>
          </>
        )}

        {activeTab === "Notification Settings" && (
          <Card className="p-6 shadow-sm space-y-3 text-sm">
            <h3 className="font-display font-bold">Notification Settings</h3>
            {[
              "Email me about new mock tests",
              "Notify me about exam alerts",
              "Daily current affairs digest",
              "Result and answer-key updates",
            ].map((label) => (
              <label key={label} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                <span>{label}</span>
                <input type="checkbox" defaultChecked className="h-4 w-8 accent-primary" />
              </label>
            ))}
          </Card>
        )}

        {activeTab === "Privacy & Security" && (
          <Card className="p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold">Privacy & Security</h3>
            <Button variant="outline" onClick={() => setPwdOpen(true)}>
              <KeyRound className="h-4 w-4 mr-2" /> Change Password
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                clearAuth();
                navigate({ to: "/" });
              }}
            >
              Sign out
            </Button>
          </Card>
        )}

        {activeTab === "Account Settings" && (
          <Card className="p-6 shadow-sm space-y-3">
            <h3 className="font-display font-bold">Account Settings</h3>
            <p className="text-sm text-muted-foreground">Manage your account-level options.</p>
            <Button variant="destructive" onClick={() => setDelOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete Account
            </Button>
          </Card>
        )}
      </div>

      <aside className="space-y-5">
        <Card className="p-5 shadow-sm">
          <h4 className="font-display font-bold text-sm mb-4">Profile Completion</h4>
          <div className="flex items-center gap-4">
            <CircularProgress value={completion} />
            <div>
              <div className="font-display font-semibold text-sm">
                {completion === 100 ? "All set!" : "Almost there."}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Add your name and email to complete your profile.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 shadow-sm bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Headphones className="h-4 w-4 text-primary" />
            <h4 className="font-display font-bold text-sm">Need Help?</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Facing issues with your account? Our support team is here to help you.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-primary text-primary hover:bg-primary/10"
            onClick={() => setSupportOpen(true)}
          >
            Contact Support
          </Button>
        </Card>
      </aside>

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter a new password for your account.</DialogDescription>
          </DialogHeader>
          <ChangePasswordForm onClose={() => setPwdOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                toast.error("Account deletion requires admin action. Please contact support.");
                setDelOpen(false);
              }}
            >
              Yes, delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Support</DialogTitle>
            <DialogDescription>Tell us what's going on and we'll get back to you.</DialogDescription>
          </DialogHeader>
          <SupportForm onClose={() => setSupportOpen(false)} />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function QuickCard({
  icon: Icon,
  iconBg,
  title,
  desc,
  onClick,
}: {
  icon: any;
  iconBg: string;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="text-left p-4 rounded-lg border border-border bg-card hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`h-10 w-10 rounded-lg grid place-items-center ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
      <div className="font-display font-semibold text-sm mb-1">{title}</div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </motion.button>
  );
}

function CircularProgress({ value }: { value: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-20 w-20 flex-none">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r={r} className="stroke-muted" strokeWidth="6" fill="none" />
        <motion.circle
          cx="35"
          cy="35"
          r={r}
          className="stroke-success"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-display font-bold text-sm">
        {value}%
      </div>
    </div>
  );
}

function ChangePasswordForm({ onClose }: { onClose: () => void }) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">New Password</Label>
        <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Confirm Password</Label>
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          disabled={busy || !pwd || pwd !== confirm}
          onClick={async () => {
            setBusy(true);
            try {
              await userService.updateMe({ password: pwd });
              toast.success("Password updated");
              onClose();
            } catch (err: any) {
              toast.error(err?.response?.data?.message ?? "Could not update password");
            } finally {
              setBusy(false);
            }
          }}
        >
          Update Password
        </Button>
      </DialogFooter>
    </div>
  );
}

function SupportForm({ onClose }: { onClose: () => void }) {
  const [msg, setMsg] = useState("");
  return (
    <div className="space-y-3">
      <textarea
        rows={5}
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="Describe your issue..."
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          disabled={!msg}
          onClick={() => {
            toast.success("Support request sent. We'll be in touch soon.");
            onClose();
          }}
        >
          Send Message
        </Button>
      </DialogFooter>
    </div>
  );
}
