import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveCurrentAffairsImageUrl } from "@/services/mediaService";

// Shared image-resolution + fallback logic for CurrentAffairs.image, used by
// both the article card/list view and the article detail hero so a
// broken/missing image degrades identically everywhere: absolute gktoday.in
// URLs render as-is, relative admin-uploaded paths get the API host
// prepended, and anything empty (or that fails to load) shows a clean
// "No image for this article" placeholder instead of a broken-image icon.
export function ArticleImage({
  image,
  alt,
  className,
  iconClassName,
  compact = false,
}: {
  image?: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
  /** Icon-only placeholder, no label text — for small thumbnails where the
      full "No image for this article" sentence can't fit. */
  compact?: boolean;
}) {
  const [errored, setErrored] = useState(false);
  const url = resolveCurrentAffairsImageUrl(image);
  const showImage = !!url && !errored;

  return (
    <div className={cn("relative overflow-hidden shrink-0", className)}>
      {showImage ? (
        <img
          src={url}
          alt={alt}
          onError={() => setErrored(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full grid place-items-center gap-1 bg-linear-to-br from-muted to-muted/60 text-muted-foreground">
          <ImageOff className={cn("h-6 w-6", iconClassName)} />
          {!compact && (
            <span className="text-[11px] font-medium px-3 text-center leading-snug">No image for this article</span>
          )}
        </div>
      )}
    </div>
  );
}
