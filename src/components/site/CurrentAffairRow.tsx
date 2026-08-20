import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tintFor } from "@/lib/current-affairs-tint";
import { ArticleImage } from "@/components/site/ArticleImage";

// Shared "Latest Updates" row — used on the main Current Affairs feed and
// the Bookmarked Current Affairs page so the two lists can't drift apart.
export function CurrentAffairRow({
  article,
  isBookmarked,
  onToggleBookmark,
}: {
  article: any;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
}) {
  const t = tintFor(article.category);
  return (
    <motion.div whileHover={{ x: 2 }} className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <ArticleImage image={article.image} alt={article.title} className="h-14 w-20 rounded-lg" />
      <Link to="/dashboard/current-affairs/$id" params={{ id: article._id }} className="flex-1 min-w-0">
        <Badge className={cn("text-[10px] border-transparent mb-1", t.bg, t.text)}>{article.category}</Badge>
        <h4 className="text-sm font-semibold leading-snug hover:text-primary">{article.title}</h4>
        {article.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{article.summary}</p>}
      </Link>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-[11px] text-muted-foreground">{format(new Date(article.date), "dd MMM yyyy")}</span>
        <button onClick={() => onToggleBookmark(article._id)} className="text-muted-foreground hover:text-primary">
          <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-primary text-primary")} />
        </button>
      </div>
    </motion.div>
  );
}
