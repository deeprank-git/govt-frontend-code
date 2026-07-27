import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, CalendarDays, Tag as TagIcon, AlertTriangle, FileQuestion, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import * as currentAffairsService from "@/services/currentAffairsService";
import { resolveMediaUrl } from "@/services/mediaService";
import { unwrapItem, unwrapList } from "@/lib/api-unwrap";

export const Route = createFileRoute("/_authenticated/dashboard/current-affairs_/$id")({
  component: CurrentAffairDetailPage,
});

function CurrentAffairDetailPage() {
  const { id } = Route.useParams();

  const { data: res, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["current-affair", id],
    queryFn: () => currentAffairsService.getCurrentAffairById(id),
    // The backend increments the article's view count on every successful
    // fetch — a genuine navigation to this page is a real "view" and should
    // still fetch fresh, but merely refocusing the browser tab shouldn't
    // silently re-fetch (and re-increment) in the background.
    refetchOnWindowFocus: false,
    retry: (failureCount, err: any) => err?.response?.status !== 404 && failureCount < 2,
  });
  const article = unwrapItem<any>(res);
  const notFound = (error as any)?.response?.status === 404;

  const { data: moreRes } = useQuery({
    queryKey: ["current-affair-more", article?.category, id],
    queryFn: () => currentAffairsService.getCurrentAffairs({ category: article.category, limit: 6 }),
    enabled: !!article?.category,
  });
  const more = unwrapList<any>(moreRes).filter((a) => a._id !== id).slice(0, 4);

  if (isLoading) {
    return (
      <div className="max-w-3xl">
        <Skeleton className="h-8 w-40 mb-4" />
        <Card className="p-6 lg:p-8 space-y-4">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-3xl">
        <Card className="p-10 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-muted grid place-items-center">
            <FileQuestion className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="font-display font-bold text-lg mt-4">Article not found</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This article may have been removed, unpublished, or the link is incorrect.
          </p>
          <Button asChild className="mt-5">
            <Link to="/dashboard/current-affairs"><ArrowLeft className="h-4 w-4 mr-1.5" />Back to Current Affairs</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="max-w-3xl">
        <Card className="p-10 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/10 grid place-items-center">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="font-display font-bold text-lg mt-4">Could not load this article</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Something went wrong. Check your connection and try again.
          </p>
          <div className="flex items-center justify-center gap-2 mt-5">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RotateCcw className="h-4 w-4 mr-1.5" />{isFetching ? "Retrying…" : "Try Again"}
            </Button>
            <Button asChild variant="ghost">
              <Link to="/dashboard/current-affairs">Back to Current Affairs</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to="/dashboard/current-affairs"><ArrowLeft className="h-4 w-4 mr-1" />Back to Current Affairs</Link>
      </Button>

      {/* Matches the list page's xl:grid-cols-[1fr_320px] split so the article
          uses the full available width instead of leaving a large empty gap
          next to a narrow, centered card. */}
      <div className="grid xl:grid-cols-[1fr_320px] gap-5 items-start">
        <Card className="p-6 lg:p-8 min-w-0">
          <Badge className="bg-primary/15 text-primary border-transparent">{article.category}</Badge>
          <h1 className="mt-3 text-2xl md:text-3xl font-display font-extrabold">{article.title}</h1>
          <div className="flex items-center flex-wrap gap-4 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date(article.date).toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" })}
            </span>
            {typeof article.views === "number" && (
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                {article.views.toLocaleString()} view{article.views === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {article.image && <img src={resolveMediaUrl(article.image)} alt="" className="w-full rounded-lg mt-5 max-h-96 object-cover" />}
          {article.summary && <p className="mt-5 text-base text-muted-foreground italic">{article.summary}</p>}
          <div className="mt-5 text-[15px] leading-7 whitespace-pre-line max-w-[70ch]">{article.content}</div>
          {Array.isArray(article.tags) && article.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-border">
              <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
              {article.tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs font-normal">{tag}</Badge>
              ))}
            </div>
          )}
        </Card>

        <aside className="space-y-4">
          <Card className="p-4">
            <h3 className="font-display font-bold text-sm mb-3">More in {article.category}</h3>
            {more.length > 0 ? (
              <div className="divide-y divide-border">
                {more.map((a: any) => (
                  <Link
                    key={a._id}
                    to="/dashboard/current-affairs/$id"
                    params={{ id: a._id }}
                    className="block py-3 first:pt-0 last:pb-0 hover:text-primary transition-colors"
                  >
                    <div className="text-sm font-medium leading-snug line-clamp-2">{a.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(a.date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No other articles in this category yet.</p>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="font-display font-bold text-sm mb-1">Explore Current Affairs</h3>
            <p className="text-xs text-muted-foreground">
              Browse every category and catch up on the latest updates.
            </p>
            <Button asChild className="w-full mt-3" size="sm">
              <Link to="/dashboard/current-affairs">Browse All</Link>
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
