import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Settings,
  Camera,
  Calendar,
  Phone,
  CheckCircle2,
  Edit3,
  CreditCard,
  BarChart3,
  MapPin,
  Globe,
  Target,
  User2,
  Clock,
  Activity,
  Headphones,
  Bell,
  Lock,
  KeyRound,
  Trash2,
  ChevronRight,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  component: ProfilePage,
});

const TABS = [
  "Profile Information",
  "Exam Preferences",
  "Notification Settings",
  "Privacy & Security",
  "Account Settings",
] as const;

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Profile Information");
  const [pwdOpen, setPwdOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data ?? {}));
  }, [user]);

  const completion = useMemo(() => {
    const fields = ["full_name", "dob", "mobile", "gender", "address", "preparation_goal", "avatar_url"];
    const filled = fields.filter((f) => !!profile[f]).length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: profile.full_name,
      mobile: profile.mobile,
      dob: profile.dob || null,
      gender: profile.gender,
      address: profile.address,
      preparation_goal: profile.preparation_goal,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated successfully");
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    setProfile({ ...profile, avatar_url: data.publicUrl });
    toast.success("Profile picture updated");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6"
    >
      {/* MAIN COLUMN */}
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-extrabold tracking-tight">Profile Settings</h1>
            <Settings className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your profile, preferences and account settings
          </p>
        </div>

        {/* Tabs */}
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
            {/* Personal Information Card */}
            <Card className="p-6 shadow-sm">
              <h3 className="font-display font-bold text-base mb-5">Personal Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
                {/* Avatar */}
                <div className="flex md:block justify-center">
                  <div className="relative">
                    <Avatar className="h-28 w-28 ring-1 ring-border">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback className="bg-muted text-foreground text-xl font-display font-bold">
                        {(profile.full_name ?? user?.email ?? "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute bottom-1 right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center cursor-pointer shadow-md hover:scale-110 transition-transform">
                      <Camera className="h-3.5 w-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
                      />
                    </label>
                  </div>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Full Name</Label>
                    <Input
                      value={profile.full_name ?? ""}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Date of Birth</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="date"
                        value={profile.dob ?? ""}
                        onChange={(e) => setProfile({ ...profile, dob: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Email Address</Label>
                    <div className="relative">
                      <Input value={user?.email ?? ""} disabled className="pr-24" />
                      <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-success/15 text-success border-0 hover:bg-success/15 text-[10px] gap-1 px-2">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        value={profile.mobile ?? ""}
                        onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                        className="pl-9 pr-24"
                        placeholder="+91 00000 00000"
                      />
                      {profile.mobile && (
                        <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-success/15 text-success border-0 hover:bg-success/15 text-[10px] gap-1 px-2">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Gender</Label>
                      <div className="flex items-center gap-5 h-10">
                        {["Male", "Female", "Other"].map((g) => (
                          <label key={g} className="inline-flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="radio"
                              name="gender"
                              className="h-4 w-4 accent-primary"
                              checked={profile.gender === g}
                              onChange={() => setProfile({ ...profile, gender: g })}
                            />
                            {g}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Category</Label>
                      <Select
                        value={profile.category ?? "General"}
                        onValueChange={(v) => setProfile({ ...profile, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["General", "OBC", "SC", "ST", "EWS"].map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Address</Label>
                    <Textarea
                      rows={2}
                      value={profile.address ?? ""}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      placeholder="Your address"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end">
                    <Button onClick={save} disabled={saving} className="px-6">
                      {saving ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Settings */}
            <Card className="p-6 shadow-sm">
              <h3 className="font-display font-bold text-base mb-5">Quick Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickCard
                  icon={Bell}
                  iconBg="bg-purple-50 text-purple-600"
                  title="Notification Settings"
                  desc="Manage how you receive alerts and updates."
                  onClick={() => setActiveTab("Notification Settings")}
                />
                <QuickCard
                  icon={Lock}
                  iconBg="bg-emerald-50 text-emerald-600"
                  title="Privacy & Security"
                  desc="Control your privacy and security preferences."
                  onClick={() => setActiveTab("Privacy & Security")}
                />
                <QuickCard
                  icon={KeyRound}
                  iconBg="bg-orange-50 text-orange-600"
                  title="Change Password"
                  desc="Update your password regularly for security."
                  onClick={() => setPwdOpen(true)}
                />
                <QuickCard
                  icon={Trash2}
                  iconBg="bg-rose-50 text-rose-600"
                  title="Delete Account"
                  desc="Permanently delete your account and data."
                  onClick={() => setDelOpen(true)}
                />
              </div>
            </Card>

            {/* Info bar */}
            <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <Info className="h-5 w-5 text-primary flex-none mt-0.5" />
              <p className="text-sm">
                <span className="font-semibold">Important:</span>{" "}
                <span className="text-muted-foreground">
                  Keep your profile updated to get relevant exam notifications and personalized study
                  recommendations.
                </span>
              </p>
            </div>
          </>
        )}

        {activeTab === "Exam Preferences" && (
          <Card className="p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold">Exam Preferences</h3>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Preparation Goal</Label>
              <Input
                value={profile.preparation_goal ?? ""}
                onChange={(e) => setProfile({ ...profile, preparation_goal: e.target.value })}
                placeholder="e.g. Government Job in Central Services"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save Preferences"}
              </Button>
            </div>
          </Card>
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
              onClick={async () => {
                await supabase.auth.signOut();
                toast.success("Signed out");
              }}
            >
              Sign out of all devices
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

      {/* RIGHT SIDEBAR */}
      <aside className="space-y-5">
        {/* Profile Completion */}
        <Card className="p-5 shadow-sm">
          <h4 className="font-display font-bold text-sm mb-4">Profile Completion</h4>
          <div className="flex items-center gap-4">
            <CircularProgress value={completion} />
            <div>
              <div className="font-display font-semibold text-sm">Great! Almost there.</div>
              <p className="text-xs text-muted-foreground mt-1">
                Complete your profile to get personalized exam updates.
              </p>
            </div>
          </div>
        </Card>

        {/* Exam Preferences Summary */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display font-bold text-sm">Exam Preferences Summary</h4>
            <button
              onClick={() => setActiveTab("Exam Preferences")}
              className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              <Edit3 className="h-3 w-3" /> Edit
            </button>
          </div>
          <div className="space-y-3.5 text-sm">
            <PrefRow icon={CreditCard} tint="bg-purple-50 text-purple-600" label="Exam Categories" value="SSC, Banking, Railways" />
            <PrefRow icon={BarChart3} tint="bg-emerald-50 text-emerald-600" label="Exam Levels" value="Graduate, 12th Pass" />
            <PrefRow icon={MapPin} tint="bg-orange-50 text-orange-600" label="Preferred States" value="Rajasthan, Delhi, Uttar Pradesh" />
            <PrefRow icon={Globe} tint="bg-blue-50 text-blue-600" label="Preferred Languages" value="English, Hindi" />
            <PrefRow icon={Target} tint="bg-rose-50 text-rose-600" label="Preparation Goal" value={profile.preparation_goal ?? "Government Job in Central Services"} />
          </div>
        </Card>

        {/* Account Status */}
        <Card className="p-5 shadow-sm">
          <h4 className="font-display font-bold text-sm mb-4">Account Status</h4>
          <div className="space-y-3 text-sm">
            <StatusRow icon={User2} label="Account Type" value="Free User" />
            <StatusRow icon={Calendar} label="Member Since" value="12 Jan 2024" />
            <StatusRow icon={Clock} label="Last Login" value="24 May 2024, 10:30 AM" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-4 w-4" /> Account Status
              </div>
              <Badge className="bg-success/15 text-success border-0 hover:bg-success/15">Active</Badge>
            </div>
          </div>
        </Card>

        {/* Need Help */}
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

      {/* Change Password Modal */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter a new password for your account.</DialogDescription>
          </DialogHeader>
          <ChangePasswordForm onClose={() => setPwdOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Delete Account Modal */}
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
              onClick={async () => {
                toast.error("Account deletion requires admin action. Please contact support.");
                setDelOpen(false);
              }}
            >
              Yes, delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Support Modal */}
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

function PrefRow({
  icon: Icon,
  tint,
  label,
  value,
}: {
  icon: any;
  tint: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`h-9 w-9 rounded-lg grid place-items-center flex-none ${tint}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

function StatusRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <span className="font-medium text-foreground">{value}</span>
    </div>
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
            const { error } = await supabase.auth.updateUser({ password: pwd });
            setBusy(false);
            if (error) toast.error(error.message);
            else {
              toast.success("Password updated");
              onClose();
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
      <Textarea rows={5} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Describe your issue..." />
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
