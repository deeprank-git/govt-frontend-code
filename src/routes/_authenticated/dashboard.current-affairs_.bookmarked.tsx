import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Bookmark } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import * as currentAffairsService from "@/services/currentAffairsService";
import { unwrapList } from "@/lib/api-unwrap";
import { CurrentAffairRow } from "@/components/site/CurrentAffairRow";
import { CurrentAffairsSidebar } from "@/components/site/CurrentAffairsSidebar";
import { useCurrentAffairsBookmarks } from "@/hooks/use-current-affairs-bookmarks";

export const Route = createFileRoute("/_authenticated/dashboard/current-affairs_/bookmarked")({
  component: BookmarkedCurrentAffairsPage,
});

function BookmarkedCurrentAffairsPage() {
  const [sort, setSort] = useState<"latest" | "oldest">("latest");
  const { bookmarkedIds, toggleBookmark } = useCurrentAffairsBookmarks();

  const { data: caRes, isLoading } = useQuery({
    queryKey: ["dashboard-current-affairs"],
    queryFn: () => currentAffairsService.getCurrentAffairs({ limit: 100 }),
  });
  const ca = unwrapList<any>(caRes);
  const bookmarkSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);

  // Sorted by article date, same field/comparator the main feed's "Latest
  // Updates" sort already uses — keeps the "Latest First" label meaningful
  // here instead of introducing a second, unlabeled bookmark-date ordering.
  const items = useMemo(() => {
    const list = ca.filter((a: any) => bookmarkSet.has(a._id));
    return list.sort((a: any, b: any) => {
      const diff = +new Date(b.date) - +new Date(a.date);
      return sort === "latest" ? diff : -diff;
    });
  }, [ca, bookmarkSet, sort]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-5">
      <div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <Link to="/dashboard/current-affairs" className="hover:text-primary">Current Affairs</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Bookmarked</span>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-display font-extrabold">Bookmarked Current Affairs</h1>
          <Bookmark className="h-5 w-5 text-primary fill-primary" />
        </div>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          All your saved current affairs in one place.
        </p>
      </div>

      {!isLoading && items.length > 0 && (
        <Card className="p-3 flex items-center gap-3 shadow-sm w-fit">
          <div className="h-11 w-11 rounded-xl grid place-items-center bg-blue-100 text-blue-600">
            <Bookmark className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-extrabold text-lg leading-tight">{items.length}</div>
            <div className="text-[11px] text-muted-foreground truncate">Saved Article{items.length === 1 ? "" : "s"}</div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5 min-w-0">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold flex items-center gap-2">
                <span className="h-4 w-1 bg-primary rounded-full" /> Saved Articles
              </h3>
              {items.length > 0 && (
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
              )}
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3 py-1">
                    <Skeleton className="h-14 w-20 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <Skeleton className="h-4 w-16 rounded-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-14">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-muted grid place-items-center">
                  <Bookmark className="h-7 w-7 text-muted-foreground" />
                </div>
                <h4 className="font-display font-semibold text-sm mt-4">No bookmarks yet</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Save current affairs you want to revisit later and they'll show up here.
                </p>
                <Button asChild className="mt-5">
                  <Link to="/dashboard/current-affairs">Browse Current Affairs</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((a: any) => (
                  <CurrentAffairRow key={a._id} article={a} isBookmarked={bookmarkSet.has(a._id)} onToggleBookmark={toggleBookmark} />
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <CurrentAffairsSidebar />
        </div>
      </div>
    </motion.div>
  );
}
