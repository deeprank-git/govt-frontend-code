import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, FileQuestion, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { ArticleDetail } from "@/components/site/ArticleDetail";
import * as currentAffairsService from "@/services/currentAffairsService";
import { unwrapItem, unwrapList } from "@/lib/api-unwrap";

export const Route = createFileRoute("/current-affairs_/$id")({
  component: CurrentAffairDetailPage,
});

function CurrentAffairDetailPage() {
  const { id } = Route.useParams();

  // Public endpoint as of 2026-07-28 — no auth needed, fetched for every visitor.
  const { data: res, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["public-current-affair", id],
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
    queryKey: ["public-current-affair-more", article?.category, id],
    queryFn: () => currentAffairsService.getCurrentAffairs({ category: article.category, limit: 6 }),
    enabled: !!article?.category,
  });
  const more = unwrapList<any>(moreRes).filter((a) => a._id !== id).slice(0, 4);

  return (
    <SiteShell>
      <div className="container mx-auto px-4 lg:px-6 py-10">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Current Affairs", to: "/current-affairs" }, { label: "Article" }]} />
        <Button variant="ghost" size="sm" asChild className="mt-4 -ml-2">
          <Link to="/current-affairs"><ArrowLeft className="h-4 w-4 mr-1" />Back to Current Affairs</Link>
        </Button>

        {isLoading && (
          <div className="max-w-3xl mt-6">
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
        )}

        {!isLoading && notFound && (
          <div className="max-w-3xl mt-6">
            <Card className="p-10 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-muted grid place-items-center">
                <FileQuestion className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="font-display font-bold text-lg mt-4">Article not found</h2>
              <p className="text-sm text-muted-foreground mt-1">
                This article may have been removed, unpublished, or the link is incorrect.
              </p>
              <Button asChild className="mt-5">
                <Link to="/current-affairs"><ArrowLeft className="h-4 w-4 mr-1.5" />Back to Current Affairs</Link>
              </Button>
            </Card>
          </div>
        )}

        {!isLoading && !notFound && (isError || !article) && (
          <div className="max-w-3xl mt-6">
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
                  <Link to="/current-affairs">Back to Current Affairs</Link>
                </Button>
              </div>
            </Card>
          </div>
        )}

        {!isLoading && !notFound && !isError && article && (
          <div className="mt-6">
            <ArticleDetail article={article} more={more} variant="public" />
          </div>
        )}
      </div>
    </SiteShell>
  );
}
