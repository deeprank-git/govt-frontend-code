// Backend responses generally look like { success, data } or { success, count, data: [...] },
// but never trust the shape blindly — unwrap defensively so a missing/odd response degrades
// to an empty list / null instead of throwing.

export function unwrapList<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function unwrapItem<T = any>(payload: any): T | null {
  if (payload == null) return null;
  if (payload.data !== undefined && payload.data !== null && !Array.isArray(payload.data)) {
    return payload.data as T;
  }
  if (payload.success === undefined && payload.data === undefined) {
    return payload as T;
  }
  return null;
}
