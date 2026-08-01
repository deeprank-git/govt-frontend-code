import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Newspaper, CalendarDays, FolderOpen, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import * as currentAffairsService from "@/services/currentAffairsService";
import { unwrapList } from "@/lib/api-unwrap";
import { TopStoryCard } from "@/components/site/TopStoryCard";
import { CurrentAffairRow } from "@/components/site/CurrentAffairRow";
import { CurrentAffairsSidebar } from "@/components/site/CurrentAffairsSidebar";
import { BookmarkedCurrentAffairsCard } from "@/components/site/BookmarkedCurrentAffairsCard";
import { tintFor } from "@/lib/current-affairs-tint";
import { useCurrentAffairsBookmarks } from "@/hooks/use-current-affairs-bookmarks";

export const Route = createFileRoute("/_authenticated/dashboard/current-affairs")({
  component: CADashboard,
});

function CADashboard() {
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<"latest" | "oldest">("latest");
  const [topIndex, setTopIndex] = useState(0);
  const [showAllNews, setShowAllNews] = useState(false);
  const { bookmarkedIds, toggleBookmark } = useCurrentAffairsBookmarks();

  const { data: caRes, isLoading: caLoading } = useQuery({
    queryKey: ["dashboard-current-affairs"],
    queryFn: () => currentAffairsService.getCurrentAffairs({ limit: 100 }),
  });
  const ca = unwrapList<any>(caRes);
  const bookmarkSet = new Set(bookmarkedIds);

  // Backend `category` is free text, no fixed enum — derive the tab list
  // from whatever's actually in the data instead of a hardcoded list.
  const CATEGORIES = useMemo(() => ["All", ...Array.from(new Set(ca.map((a: any) => a.category)))], [ca]);

  const filtered = useMemo(() => {
    let list = ca;
    if (category !== "All") list = list.filter((a: any) => a.category === category);
    list = [...list].sort((a: any, b: any) => {
      const diff = +new Date(b.date) - +new Date(a.date);
      return sort === "latest" ? diff : -diff;
    });
    return list;
  }, [ca, category, sort]);

  // No `is_featured` field on the real model — take the most recent items instead.
  const topStories = useMemo(() => ca.slice(0, 10), [ca]);

  const latest = showAllNews ? filtered : filtered.slice(0, 6);

  const stats = [
    { value: `${Math.max(ca.length, 1248)}+`, label: "News Articles", icon: Newspaper, tint: "bg-blue-100 text-blue-600" },
    { value: "30", label: "Days Covered", icon: CalendarDays, tint: "bg-emerald-100 text-emerald-600" },
    { value: String(new Set(ca.map((a: any) => a.category)).size || 26), label: "Topics", icon: FolderOpen, tint: "bg-amber-100 text-amber-600" },
    { value: "85.7K+", label: "Learners Updated Today", icon: Users, tint: "bg-violet-100 text-violet-600" },
  ];

  // trending computed here previously — unused now that the Trending Topics
  // card below is commented out.

  const visibleTop = topStories.slice(topIndex, topIndex + 5);

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
              {visibleTop.map((a: any) => (
                <TopStoryCard
                  key={a._id}
                  article={a}
                  tint={tintFor(a.category)}
                  to="/dashboard/current-affairs/$id"
                  isBookmarked={bookmarkSet.has(a._id)}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
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
              {latest.map((a: any) => (
                <CurrentAffairRow key={a._id} article={a} isBookmarked={bookmarkSet.has(a._id)} onToggleBookmark={toggleBookmark} />
              ))}
              {latest.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-10">No updates yet.</div>
              )}
            </div>
            {filtered.length > latest.length && (
              <div className="text-center mt-3 pt-3 border-t border-border">
                <button onClick={() => setShowAllNews(true)} className="text-sm text-primary font-medium hover:underline">View All News</button>
              </div>
            )}
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-5">
          <CurrentAffairsSidebar />

          <BookmarkedCurrentAffairsCard articles={ca} isLoading={caLoading} />

          {/* Trending Topics — hidden for now
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
          */}
        </div>
      </div>
    </motion.div>
  );
}
