const STORAGE_KEY = "gp_ca_bookmarks";

export type BookmarkEntry = { id: string; bookmarkedAt: string };

function read(): BookmarkEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BookmarkEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: BookmarkEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  // Same same-tab pub/sub trick as auth-store's gp-auth-change — lets every
  // mounted useCurrentAffairsBookmarks() instance (widget, main feed, the
  // bookmarked page) re-render in sync without a page reload.
  window.dispatchEvent(new Event("gp-ca-bookmarks-change"));
}

export function getBookmarks(): BookmarkEntry[] {
  return read();
}

export function isBookmarked(id: string): boolean {
  return read().some((b) => b.id === id);
}

// No bookmark endpoint exists on the backend (see src/API backend
// reference.md) — this persists client-side only (per-browser, not synced
// across devices) via localStorage, mirroring the auth-store pattern.
export function toggleBookmark(id: string) {
  const entries = read();
  const exists = entries.some((b) => b.id === id);
  write(exists ? entries.filter((b) => b.id !== id) : [...entries, { id, bookmarkedAt: new Date().toISOString() }]);
}
