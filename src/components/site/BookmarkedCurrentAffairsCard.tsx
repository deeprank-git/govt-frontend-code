import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tintFor } from "@/lib/current-affairs-tint";
import { useCurrentAffairsBookmarks } from "@/hooks/use-current-affairs-bookmarks";

const CARD_HEADER = (
  <div className="flex items-center justify-between mb-3">
    <h3 className="font-display font-bold text-sm flex items-center gap-2">
      <span className="h-4 w-1 bg-primary rounded-full" /> Bookmarked Current Affairs
    </h3>
    <Bookmark className="h-4 w-4 fill-primary text-primary" />
  </div>
);

// Right-sidebar widget on the main Current Affairs dashboard page — the 4
// most recently bookmarked articles (article date descending, same sort
// logic the "View All" page defaults to), text-only rows since a 320px
// sidebar doesn't have room for a thumbnail without crowding the title.
export function BookmarkedCurrentAffairsCard({ articles, isLoading }: { articles: any[]; isLoading?: boolean }) {
  const { bookmarkedIds } = useCurrentAffairsBookmarks();

  if (isLoading) {
    return (
      <Card className="p-4">
        {CARD_HEADER}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5 py-1">
              <Skeleton className="h-3.5 w-14 rounded-full" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const byId = new Map(articles.map((a) => [a._id, a]));
  const items = bookmarkedIds
    .map((id) => byId.get(id))
    .filter((a): a is any => !!a)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 4);

  return (
    <Card className="p-4">
      {CARD_HEADER}

      {items.length === 0 ? (
        <div className="text-center py-6">
          <Bookmark className="h-6 w-6 text-muted-foreground/40 mx-auto" />
          <p className="text-xs text-muted-foreground mt-2">You haven't bookmarked any current affairs yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((a) => {
            const t = tintFor(a.category);
            return (
              <Link
                key={a._id}
                to="/dashboard/current-affairs/$id"
                params={{ id: a._id }}
                className="block py-2.5 first:pt-0 last:pb-0 group"
              >
                <Badge className={cn("text-[9px] border-transparent mb-1", t.bg, t.text)}>{a.category}</Badge>
                <h4 className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-primary">{a.title}</h4>
                <span className="text-[10px] text-muted-foreground mt-1 block">{format(new Date(a.date), "dd MMM yyyy")}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="text-center mt-3 pt-3 border-t border-border">
        <Link to="/dashboard/current-affairs/bookmarked" className="text-sm text-primary font-medium hover:underline">
          View All
        </Link>
      </div>
    </Card>
  );
}
