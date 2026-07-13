import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Newspaper,
  CalendarDays,
  FolderOpen,
  Users,
  Bookmark,
  Flame,
  ChevronLeft,
  ChevronRight,
  Mail,
  TrendingUp,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/current-affairs")({
  component: CADashboard,
});

const CATEGORIES = [
  "All", "Polity", "Economy", "Indian Economy", "International Affairs",
  "Science & Tech", "Environment", "Sports", "Awards", "Reports",
];

const CAT_TINT: Record<string, { bg: string; text: string }> = {
  Polity: { bg: "bg-violet-100", text: "text-violet-700" },
  Economy: { bg: "bg-amber-100", text: "text-amber-700" },
  "Indian Economy": { bg: "bg-orange-100", text: "text-orange-700" },
  "International Affairs": { bg: "bg-blue-100", text: "text-blue-700" },
  International: { bg: "bg-blue-100", text: "text-blue-700" },
  "Science & Tech": { bg: "bg-cyan-100", text: "text-cyan-700" },
  Environment: { bg: "bg-emerald-100", text: "text-emerald-700" },
  Sports: { bg: "bg-rose-100", text: "text-rose-700" },
  Awards: { bg: "bg-pink-100", text: "text-pink-700" },
  Reports: { bg: "bg-indigo-100", text: "text-indigo-700" },
  National: { bg: "bg-orange-100", text: "text-orange-700" },
};

function tintFor(cat: string) {
  return CAT_TINT[cat] ?? { bg: "bg-primary/10", text: "text-primary" };
}

function CADashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<"latest" | "oldest">("latest");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [topIndex, setTopIndex] = useState(0);

  const { data: ca = [] } = useQuery({
    queryKey: ["dash-ca-full"],
    queryFn: async () =>
      (await supabase.from("current_affairs").select("*").order("published_at", { ascending: false })).data ?? [],
  });

  const { data: bookmarks = [] } = useQuery({
    queryKey: ["ca-bookmarks", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase.from("bookmarks").select("item_id").eq("user_id", user!.id).eq("item_type", "current_affair")).data ?? [],
  });
  const bookmarkSet = new Set(bookmarks.map((b: any) => b.item_id));

  const toggleBookmark = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Sign in required");
      if (bookmarkSet.has(id)) {
        await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("item_id", id).eq("item_type", "current_affair");
      } else {
        await supabase.from("bookmarks").insert({ user_id: user.id, item_id: id, item_type: "current_affair" });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ca-bookmarks", user?.id] }),
  });

  const filtered = useMemo(() => {
    let list = ca;
    if (category !== "All") list = list.filter((a: any) => a.category === category);
    list = [...list].sort((a: any, b: any) => {
      const diff = +new Date(b.published_at) - +new Date(a.published_at);
      return sort === "latest" ? diff : -diff;
    });
    return list;
  }, [ca, category, sort]);

  const topStories = useMemo(() => {
    const featured = ca.filter((a: any) => a.is_featured);
    return (featured.length ? featured : ca).slice(0, 10);
  }, [ca]);

  const latest = filtered.slice(0, 6);

  const stats = [
    { value: `${Math.max(ca.length, 1248)}+`, label: "News Articles", icon: Newspaper, tint: "bg-blue-100 text-blue-600" },
    { value: "30", label: "Days Covered", icon: CalendarDays, tint: "bg-emerald-100 text-emerald-600" },
    { value: String(new Set(ca.map((a: any) => a.category)).size || 26), label: "Topics", icon: FolderOpen, tint: "bg-amber-100 text-amber-600" },
    { value: "85.7K+", label: "Learners Updated Today", icon: Users, tint: "bg-violet-100 text-violet-600" },
  ];

  const trending = useMemo(() => {
    const counts: Record<string, number> = {};
    ca.forEach((a: any) => { counts[a.category] = (counts[a.category] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [ca]);

  // Streak (simulated: 18-day)
  const streak = 18;
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date().getDay(); // 0 Sun..6 Sat
  const todayIdx = (today + 6) % 7; // M=0
  const visibleTop = topStories.slice(topIndex, topIndex + 5);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    toast.success("Subscribed! Check your inbox tomorrow.");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-5">
      {/* Header + Stats */}
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-extrabold">Current Affairs</h1>
            <Newspaper className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Stay updated with the latest current affairs for all government exams.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 xl:max-w-3xl xl:flex-1">
          {stats.map((s) => (
            <motion.div key={s.label} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                <div className={cn("h-11 w-11 rounded-xl grid place-items-center", s.tint)}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-display font-extrabold text-lg leading-tight">{s.value}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{s.label}</div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      <Card className="p-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {c}
              </button>
            );
          })}
          <button className="px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:bg-muted">More</button>
        </div>
      </Card>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5 min-w-0">
          {/* Top Stories */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold flex items-center gap-2">
                <span className="h-4 w-1 bg-primary rounded-full" /> Top Stories
              </h3>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-7 w-7" disabled={topIndex === 0} onClick={() => setTopIndex((i) => Math.max(0, i - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="outline" className="h-7 w-7" disabled={topIndex + 5 >= topStories.length} onClick={() => setTopIndex((i) => i + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {visibleTop.map((a: any) => {
                const t = tintFor(a.category);
                return (
                  <motion.div key={a.id} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
                    <Card className="overflow-hidden flex flex-col h-full">
                      <div className="relative h-24 bg-muted overflow-hidden group">
                        {a.image_url ? (
                          <img src={a.image_url} alt={a.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                        ) : (
                          <div className={cn("w-full h-full grid place-items-center", t.bg)}>
                            <Newspaper className={cn("h-8 w-8", t.text)} />
                          </div>
                        )}
                        <Badge className={cn("absolute top-2 left-2 text-[10px] border-transparent", t.bg, t.text)}>{a.category}</Badge>
                      </div>
                      <div className="p-2.5 flex flex-col flex-1">
                        <h4 className="text-xs font-semibold leading-snug line-clamp-3">{a.title}</h4>
                        {a.summary && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{a.summary}</p>}
                        <div className="flex items-center justify-between mt-auto pt-2">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />{format(new Date(a.published_at), "dd MMM yyyy")}
                          </span>
                          <button onClick={() => toggleBookmark.mutate(a.id)} className="text-muted-foreground hover:text-primary">
                            <Bookmark className={cn("h-3.5 w-3.5", bookmarkSet.has(a.id) && "fill-primary text-primary")} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
              {visibleTop.length === 0 && (
                <div className="col-span-full text-center text-sm text-muted-foreground py-10">No stories yet.</div>
              )}
            </div>
          </Card>

          {/* Latest Updates */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold flex items-center gap-2">
                <span className="h-4 w-1 bg-primary rounded-full" /> Latest Updates
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Sort by:</span>
                <Select value={sort} onValueChange={(v: any) => setSort(v)}>
                  <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Latest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="divide-y divide-border">
              {latest.map((a: any) => {
                const t = tintFor(a.category);
                return (
                  <motion.div key={a.id} whileHover={{ x: 2 }} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="h-14 w-20 rounded-lg overflow-hidden shrink-0 bg-muted">
                      {a.image_url ? (
                        <img src={a.image_url} alt={a.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className={cn("w-full h-full grid place-items-center", t.bg)}>
                          <Newspaper className={cn("h-5 w-5", t.text)} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge className={cn("text-[10px] border-transparent mb-1", t.bg, t.text)}>{a.category}</Badge>
                      <h4 className="text-sm font-semibold leading-snug">{a.title}</h4>
                      {a.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.summary}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[11px] text-muted-foreground">{format(new Date(a.published_at), "dd MMM yyyy")}</span>
                      <button onClick={() => toggleBookmark.mutate(a.id)} className="text-muted-foreground hover:text-primary">
                        <Bookmark className={cn("h-4 w-4", bookmarkSet.has(a.id) && "fill-primary text-primary")} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
              {latest.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-10">No updates yet.</div>
              )}
            </div>
            {filtered.length > latest.length && (
              <div className="text-center mt-3 pt-3 border-t border-border">
                <button className="text-sm text-primary font-medium hover:underline">View All News</button>
              </div>
            )}
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-5">
          {/* Digest Subscribe */}
          <Card className="p-4 bg-gradient-to-br from-primary/5 to-blue-500/5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-display font-bold text-sm">Daily Current Affairs Digest</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Get handpicked important news delivered to your inbox daily.</p>
              </div>
              <Mail className="h-8 w-8 text-primary/40" />
            </div>
            <form onSubmit={handleSubscribe} className="mt-2 space-y-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 text-xs"
                required
              />
              <Button type="submit" size="sm" className="w-full">
                {subscribed ? <><Check className="mr-1 h-3.5 w-3.5" />Subscribed</> : "Subscribe"}
              </Button>
            </form>
          </Card>

          {/* Streak */}
          <Card className="p-4">
            <h3 className="font-display font-bold text-sm flex items-center gap-2">
              <span className="h-4 w-1 bg-primary rounded-full" /> Current Affairs Streak
            </h3>
            <div className="flex items-center gap-3 mt-3">
              <div className="h-12 w-12 rounded-xl bg-orange-100 grid place-items-center">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <div className="text-lg font-display font-extrabold">{streak} Days</div>
                <div className="text-[11px] text-muted-foreground">Great going! Keep it up!</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {days.map((d, i) => {
                const done = i <= todayIdx;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{d}</span>
                    <div className={cn("h-6 w-6 rounded-full grid place-items-center text-[10px]", done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}>
                      {done && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Trending Topics */}
          <Card className="p-4">
            <h3 className="font-display font-bold text-sm flex items-center gap-2 mb-3">
              <span className="h-4 w-1 bg-primary rounded-full" /> Trending Topics
            </h3>
            <div className="space-y-2">
              {trending.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
                    <span className="font-medium">{name}</span>
                  </div>
                  <span className="text-muted-foreground">{count * 32} articles</span>
                </div>
              ))}
              {trending.length === 0 && <div className="text-xs text-muted-foreground">No trending topics yet.</div>}
            </div>
            <button className="mt-3 text-xs text-primary font-medium hover:underline w-full text-center">View All Topics</button>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
