import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, FileQuestion, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleDetail } from "@/components/site/ArticleDetail";
import * as currentAffairsService from "@/services/currentAffairsService";
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

      <ArticleDetail article={article} more={more} variant="dashboard" />
    </div>
  );
}
