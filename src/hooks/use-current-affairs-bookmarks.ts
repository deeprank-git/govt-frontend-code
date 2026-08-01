import { useEffect, useState } from "react";
import { getBookmarks, toggleBookmark, type BookmarkEntry } from "@/lib/bookmark-store";

export function useCurrentAffairsBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);

  useEffect(() => {
    const sync = () => setBookmarks(getBookmarks());
    sync();
    window.addEventListener("gp-ca-bookmarks-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("gp-ca-bookmarks-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const bookmarkedIds = bookmarks.map((b) => b.id);
  const bookmarkSet = new Set(bookmarkedIds);

  return {
    bookmarks,
    bookmarkedIds,
    isBookmarked: (id: string) => bookmarkSet.has(id),
    toggleBookmark,
  };
}
