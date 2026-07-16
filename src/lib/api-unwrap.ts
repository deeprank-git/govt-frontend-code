/**
 * The GovtPrep backend's success-response envelope isn't documented (only its
 * error shape, `{ success:false, message }`, is). These helpers unwrap the
 * common shapes defensively (raw array/object, or `{ data: ... }`) so UI code
 * doesn't break if the real envelope differs slightly from what's assumed here.
 */
export function unwrapList<T = Record<string, unknown>>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const obj = payload as Record<string, unknown> | null | undefined;
  if (Array.isArray(obj?.data)) return obj.data as T[];
  const nested = obj?.data as Record<string, unknown> | undefined;
  if (Array.isArray(nested?.data)) return nested.data as T[];
  return [];
}

export function unwrapItem<T = Record<string, unknown>>(payload: unknown): T | null {
  if (!payload) return null;
  const obj = payload as Record<string, unknown>;
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) return obj.data as T;
  return obj as T;
}
