import { Link } from "@tanstack/react-router";
import { CalendarDays, Eye, ExternalLink, Sparkles, PenLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleImage } from "@/components/site/ArticleImage";
import { renderHighlightedParagraph, splitIntoParagraphs, ARTICLE_LINK_CLASS } from "@/lib/articleContent";
import { cn } from "@/lib/utils";

type Variant = "public" | "dashboard";

// Magazine-style Current Affairs article detail — shared between the public
// route (/current-affairs/$id) and the authenticated dashboard route
// (/dashboard/current-affairs/$id), which fetch and render the exact same
// API response (GET /api/current-affairs/:id is public/optionalAuth and
// identical for anonymous vs. logged-in non-admin callers), so there's no
// auth-based branching here — only which internal route "More in <category>"
// and "Browse All" link back into.
export function ArticleDetail({ article, more, variant }: { article: any; more: any[]; variant: Variant }) {
  const paragraphs = splitIntoParagraphs(article.content);
  const hasAttribution = !!(article.source || article.source_link || article.url);

  return (
    <div className="grid xl:grid-cols-[1fr_320px] gap-5 items-start">
      <Card className="overflow-hidden min-w-0">
        <ArticleImage image={article.image} alt={article.title} className="h-64 md:h-80 w-full" />

        <div className="p-6 lg:p-8">
          {article.category_link ? (
            <a href={article.category_link} target="_blank" rel="noopener noreferrer">
              <Badge className="bg-primary/15 text-primary border-transparent hover:bg-primary/25 transition-colors cursor-pointer">
                {article.category}
              </Badge>
            </a>
          ) : (
            <Badge className="bg-primary/15 text-primary border-transparent">{article.category}</Badge>
          )}

          <h1 className="mt-3 text-2xl md:text-4xl font-display font-extrabold leading-tight text-balance">
            {article.title}
          </h1>

          <div className="flex items-center flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground mt-4">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {new Date(article.date).toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" })}
            </span>
            {typeof article.views === "number" && (
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                {article.views.toLocaleString()} view{article.views === 1 ? "" : "s"}
              </span>
            )}
            {/* Optional polish: createdBy is absent for every scraper-sourced
                article, so its absence is a reasonable (not guaranteed) signal
                the piece is curated rather than staff-written. */}
            <span className="flex items-center gap-1.5">
              {article.createdBy ? <PenLine className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {article.createdBy ? "Staff-written" : "Curated"}
            </span>
          </div>

          {Array.isArray(article.tags) && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {article.tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {article.summary && (
            <p className="mt-5 text-lg text-muted-foreground italic leading-relaxed max-w-[720px]">{article.summary}</p>
          )}

          <div className="mt-6 space-y-4 text-[16px] md:text-[17px] leading-8 max-w-[720px] text-foreground/90">
            {paragraphs.length > 0 ? (
              paragraphs.map((para, i) => <p key={i}>{renderHighlightedParagraph(para, article.tags)}</p>)
            ) : (
              <p className="text-muted-foreground italic">No content available for this article.</p>
            )}
          </div>

          {hasAttribution && (
            <div className="mt-8 pt-5 border-t border-border text-sm">
              {article.source || article.source_link ? (
                <p className="text-muted-foreground">
                  Originally published by{" "}
                  <a
                    href={article.source_link || article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(ARTICLE_LINK_CLASS, "font-medium")}
                  >
                    {article.source || "original source"}
                  </a>
                </p>
              ) : (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(ARTICLE_LINK_CLASS, "font-medium inline-flex items-center gap-1")}
                >
                  Read original article <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </Card>

      <aside className="space-y-4">
        <Card className="p-4">
          <h3 className="font-display font-bold text-sm mb-3">More in {article.category}</h3>
          {more.length > 0 ? (
            <div className="space-y-3">
              {more.map((a: any) =>
                variant === "dashboard" ? (
                  <MoreItem key={a._id} article={a} to="/dashboard/current-affairs/$id" />
                ) : (
                  <MoreItem key={a._id} article={a} to="/current-affairs/$id" />
                ),
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No other articles in this category yet.</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-display font-bold text-sm mb-1">Explore Current Affairs</h3>
          <p className="text-xs text-muted-foreground">Browse every category and catch up on the latest updates.</p>
          <Button asChild className="w-full mt-3" size="sm">
            {variant === "dashboard" ? (
              <Link to="/dashboard/current-affairs">Browse All</Link>
            ) : (
              <Link to="/current-affairs">Browse All</Link>
            )}
          </Button>
        </Card>
      </aside>
    </div>
  );
}

function MoreItem({ article: a, to }: { article: any; to: "/current-affairs/$id" | "/dashboard/current-affairs/$id" }) {
  return (
    <Link to={to} params={{ id: a._id }} className="flex gap-3 group">
      <ArticleImage image={a.image} alt={a.title} className="h-14 w-14 rounded-md" />
      <div className="min-w-0">
        <div className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {a.title}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          {new Date(a.date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
        </div>
      </div>
    </Link>
  );
}
