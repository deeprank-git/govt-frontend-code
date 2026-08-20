// Client-side safety net for publish/draft visibility. The backend is
// documented to force isActive:true/isPublished:true for non-admin callers on
// /test-series and /tests, but that hasn't held up in practice (a draft test
// series was reachable from a real student session), so every student-facing
// screen re-checks these flags itself instead of trusting the API response.

type PublishFlags = { isPublished?: boolean; isActive?: boolean };

export function isPublishedVisible(item: PublishFlags | null | undefined): boolean {
  if (!item) return false;
  if (item.isPublished !== true) return false;
  if (item.isActive === false) return false;
  return true;
}

// Tests nest their parent TestSeries (and that series' Category) only when
// fetched by id (GET /tests/:id); list responses just give `testSeries` as a
// bare ObjectId string, so the nested checks below are skipped in that case
// and rely on the caller having already filtered the series/category lists.
type TestWithSeries = PublishFlags & {
  testSeries?: (PublishFlags & { category?: { isActive?: boolean } }) | string;
};

export function isTestVisible(test: TestWithSeries | null | undefined): boolean {
  if (!isPublishedVisible(test)) return false;
  const series = test?.testSeries;
  if (series && typeof series === "object") {
    // Only apply publish-flag checks when the backend actually included them in
    // the populated object; GET /tests/:id selects only display fields (name,
    // image) on the nested series, so missing flags mean "backend already
    // filtered" — not "series is unpublished".
    const hasPubFlags = "isPublished" in series || "isActive" in series;
    if (hasPubFlags && !isPublishedVisible(series)) return false;
    if (series.category && series.category.isActive === false) return false;
  }
  return true;
}
