import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import * as userService from "@/services/userService";
import * as mediaService from "@/services/mediaService";
import { unwrapItem } from "@/lib/api-unwrap";
import { setAuth, getToken, getUser } from "@/lib/auth-store";
import * as authService from "@/services/authService";
import { toast } from "sonner";
import {
  Settings,
  CheckCircle2,
  Bell,
  KeyRound,
  Trash2,
  ChevronRight,
  Camera,
  Headphones,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  component: ProfilePage,
});

const TABS = ["Profile Information", "Notification Settings", "Privacy & Security", "Account Settings"] as const;

type ProfileState = {
  name?: string;
  email?: string;
  mobile?: string;
  username?: string;
  address?: string;
  country?: string;
  city?: string;
  profilePicture?: string;
};

function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileState>({});
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Profile Information");
  const [pwdOpen, setPwdOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    userService
      .getMe()
      .then((res) => setProfile(unwrapItem(res) ?? {}))
      .catch(() => toast.error("Could not load profile"))
      .finally(() => setLoading(false));
  }, []);

  const FIELDS: (keyof ProfileState)[] = ["name", "email", "mobile", "username", "address", "country", "city"];
  const completion = Math.round((FIELDS.filter((f) => profile[f]).length / FIELDS.length) * 100);

  const avatarSrc = pictureFile
    ? URL.createObjectURL(pictureFile)
    : profile.profilePicture
      ? mediaService.resolveMediaUrl(profile.profilePicture)
      : undefined;

  const onPictureSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setPictureFile(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await userService.updateMe({
        name: profile.name,
        email: profile.email,
        mobile: profile.mobile,
        username: profile.username,
        address: profile.address,
        country: profile.country,
        city: profile.city,
        profilePicture: pictureFile ?? undefined,
      });
      const updated = unwrapItem<any>(res);
      if (updated) {
        setProfile((p) => ({ ...p, ...updated }));
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
                  <div className="relative h-28 w-28">
                    <Avatar className="h-28 w-28 ring-1 ring-border">
                      {avatarSrc && <AvatarImage src={avatarSrc} alt={profile.name ?? "Profile"} />}
                      <AvatarFallback className="bg-muted text-foreground text-xl font-display font-bold">
                        {(profile.name ?? profile.email ?? "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPictureSelected} />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center ring-2 ring-background"
                      aria-label="Change profile picture"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Username</Label>
                    <Input
                      value={profile.username ?? ""}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      placeholder="e.g. jane_doe"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Mobile Number</Label>
                    <Input
                      value={profile.mobile ?? ""}
                      onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                      placeholder="Your mobile number"
                      disabled={loading}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Address</Label>
                    <Input
                      value={profile.address ?? ""}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      placeholder="Street address"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">City</Label>
                    <Input
                      value={profile.city ?? ""}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Country</Label>
                    <Input
                      value={profile.country ?? ""}
                      onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                      disabled={loading}
                    />
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
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setPwdOpen(true)}>
                <KeyRound className="h-4 w-4 mr-2" /> Change Password
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  authService.logout();
                  navigate({ to: "/" });
                }}
              >
                Sign out
              </Button>
            </div>
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
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
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
            <DialogDescription>We're happy to help.</DialogDescription>
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
  const [currentPwd, setCurrentPwd] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const canSubmit = !busy && currentPwd && pwd.length >= 6 && pwd === confirm;
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Current Password</Label>
        <Input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
      </div>
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
          disabled={!canSubmit}
          onClick={async () => {
            setBusy(true);
            try {
              await userService.updateMe({ password: pwd, currentPassword: currentPwd });
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
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">Please reach out to us at the email below and we'll get back to you.</p>
      <p className="font-semibold text-primary">support@testopy.com</p>
      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </div>
  );
}
