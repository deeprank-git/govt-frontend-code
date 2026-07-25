import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as currentAffairsService from "@/services/currentAffairsService";
import { resolveMediaUrl } from "@/services/mediaService";
import { unwrapItem } from "@/lib/api-unwrap";

export const Route = createFileRoute("/_authenticated/dashboard/current-affairs/$id")({
  component: CurrentAffairDetailPage,
});

function CurrentAffairDetailPage() {
  const { id } = Route.useParams();

  const { data: res, isLoading } = useQuery({
    queryKey: ["current-affair", id],
    queryFn: () => currentAffairsService.getCurrentAffairById(id),
  });
  const article = unwrapItem<any>(res);

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!article) return <div className="p-8 text-sm text-muted-foreground">Article not found.</div>;

  return (
    <div className="max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to="/dashboard/current-affairs"><ArrowLeft className="h-4 w-4 mr-1" />Back to Current Affairs</Link>
      </Button>
      <Card className="p-6 lg:p-8">
        <Badge className="bg-primary/15 text-primary border-transparent">{article.category}</Badge>
        <h1 className="mt-3 text-2xl md:text-3xl font-display font-extrabold">{article.title}</h1>
        <div className="text-xs text-muted-foreground mt-2">
          {new Date(article.date).toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" })}
        </div>
        {article.image && <img src={resolveMediaUrl(article.image)} alt="" className="w-full rounded-lg mt-5 max-h-96 object-cover" />}
        {article.summary && <p className="mt-5 text-base text-muted-foreground italic">{article.summary}</p>}
        <div className="mt-5 text-[15px] leading-7 whitespace-pre-line">{article.content}</div>
      </Card>
    </div>
  );
}
