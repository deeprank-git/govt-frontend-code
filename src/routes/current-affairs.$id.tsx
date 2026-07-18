import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import * as currentAffairsService from "@/services/currentAffairsService";
import { unwrapItem } from "@/lib/api-unwrap";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/current-affairs/$id")({
  component: CurrentAffairDetailPage,
});

function CurrentAffairDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();

  const { data: res, isLoading } = useQuery({
    queryKey: ["current-affair", id],
    queryFn: () => currentAffairsService.getCurrentAffairById(id),
    enabled: !!user,
  });
  const article = unwrapItem<any>(res);

  return (
    <SiteShell>
      <div className="container mx-auto px-4 lg:px-6 py-10 max-w-3xl">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Current Affairs", to: "/current-affairs" }, { label: "Article" }]} />
        <Button variant="ghost" size="sm" asChild className="mt-4 -ml-2">
          <Link to="/current-affairs"><ArrowLeft className="h-4 w-4 mr-1" />Back to Current Affairs</Link>
        </Button>

        {!user && (
          <Card className="p-8 text-center mt-6">
            <p className="text-sm text-muted-foreground mb-3">Log in to read this article.</p>
            <Button asChild><Link to="/auth" search={{ mode: "login" } as never}>Login / Sign Up</Link></Button>
          </Card>
        )}

        {user && isLoading && <div className="mt-6 text-sm text-muted-foreground">Loading…</div>}
        {user && !isLoading && !article && <div className="mt-6 text-sm text-muted-foreground">Article not found.</div>}

        {user && article && (
          <Card className="p-6 lg:p-8 mt-6">
            <Badge className="bg-primary/15 text-primary border-transparent">{article.category}</Badge>
            <h1 className="mt-3 text-2xl md:text-3xl font-display font-extrabold">{article.title}</h1>
            <div className="text-xs text-muted-foreground mt-2">{new Date(article.date).toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" })}</div>
            {article.image && <img src={article.image} alt="" className="w-full rounded-lg mt-5 max-h-96 object-cover" />}
            {article.summary && <p className="mt-5 text-base text-muted-foreground italic">{article.summary}</p>}
            <div className="mt-5 text-[15px] leading-7 whitespace-pre-line">{article.content}</div>
          </Card>
        )}
      </div>
    </SiteShell>
  );
}
