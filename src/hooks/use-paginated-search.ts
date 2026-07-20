import { useState, useMemo } from "react";

const PAGE_SIZE = 15;

/**
 * Filters `items` by `searchTerm` (case-insensitive) across the given
 * `fields`, then paginates the result.
 *
 * Usage:
 *   const { filtered, page, setPage, totalPages, search, setSearch } =
 *     usePaginatedSearch(items, ["name", "description"]);
 */
export function usePaginatedSearch<T extends Record<string, unknown>>(
  items: T[],
  fields: (keyof T)[],
  pageSize: number = PAGE_SIZE,
) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      fields.some((f) => String(item[f] ?? "").toLowerCase().includes(q)),
    );
  }, [items, search, fields]);

  // Reset to page 1 when search changes
  const setSearchReset = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    search,
    setSearch: setSearchReset,
    page: safePage,
    setPage,
    totalPages,
    filtered,
    paginated,
    pageSize,
  };
}
