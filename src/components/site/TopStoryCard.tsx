import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ArticleImage } from "@/components/site/ArticleImage";

export function TopStoryCard({
  article,
  tint,
  to,
  isBookmarked,
  onToggleBookmark,
}: {
  article: any;
  tint: { bg: string; text: string };
  to: "/current-affairs/$id" | "/dashboard/current-affairs/$id";
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
}) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
      <Link to={to} params={{ id: article._id }} className="block h-full">
        <Card className="overflow-hidden flex flex-col h-full">
          <div className="relative h-24 overflow-hidden group">
            <ArticleImage
              image={article.image}
              alt={article.title}
              className="h-full w-full transition-transform duration-300 group-hover:scale-110"
              compact
            />
            <Badge
              className={cn(
                "absolute top-2 left-2 text-[10px] border-transparent truncate max-w-[70%] whitespace-nowrap",
                tint.bg,
                tint.text,
              )}
            >
              {article.category}
            </Badge>
          </div>
          <div className="p-2.5 flex flex-col flex-1">
            <h4 className="text-xs font-semibold leading-snug line-clamp-3 hover:text-primary">{article.title}</h4>
            {article.summary && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{article.summary}</p>}
            <div className="flex items-center justify-between mt-auto pt-2">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />{format(new Date(article.date), "dd MMM yyyy")}
              </span>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleBookmark(article._id); }}
                className="text-muted-foreground hover:text-primary"
              >
                <Bookmark className={cn("h-3.5 w-3.5", isBookmarked && "fill-primary text-primary")} />
              </button>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
