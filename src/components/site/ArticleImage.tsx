import { useState } from "react";
import { cn } from "@/lib/utils";
import { resolveCurrentAffairsImageUrl } from "@/services/mediaService";
import noImagePlaceholder from "@/assets/no-image-placeholder.png";

// Sampled from the placeholder PNG's own background (~#fcfcfd) so a
// letterboxed/pillarboxed edge blends into the illustration instead of
// showing a harsh color break.
const PLACEHOLDER_BG = "#fcfcfd";

// Shared image-resolution + fallback logic for CurrentAffairs.image — the
// single place every article thumbnail (Top Stories, Latest Updates,
// category-filtered lists, "More in category", the article detail hero, and
// the admin edit preview) goes through, so they can't drift out of sync the
// way "Latest Updates" once did: absolute gktoday.in URLs render as-is,
// relative admin-uploaded paths get the API host prepended, and anything
// empty (or that fails to load) shows the same hardcoded placeholder graphic
// — never a per-category icon or a broken <img>.
//
// Real photos use object-cover (arbitrary aspect ratio, cropping is fine and
// expected). The placeholder is a square illustration with its own baked-in
// "NEWS" heading and caption text, so it uses object-contain instead — cover
// would crop that text off depending on the container's aspect ratio. This
// branch lives here (not per call site) so every context stays consistent.
export function ArticleImage({
  image,
  alt,
  className,
}: {
  image?: string | null;
  alt: string;
  className?: string;
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
        <div
          className="w-full h-full flex items-center justify-center p-3"
          style={{ backgroundColor: PLACEHOLDER_BG }}
        >
          <img
            src={noImagePlaceholder}
            alt="No image available for this article"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
