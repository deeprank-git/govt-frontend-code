import axiosClient from "@/api/axiosClient";

export type UsedInRefType = "Test" | "Question" | "Page" | "TestSeries" | "CurrentAffairs" | "Category";

export async function uploadMedia(file: File, meta?: { usedInRefType?: UsedInRefType; usedInRefId?: string }) {
  const formData = new FormData();
  formData.append("file", file);
  if (meta?.usedInRefType) formData.append("usedInRefType", meta.usedInRefType);
  if (meta?.usedInRefId) formData.append("usedInRefId", meta.usedInRefId);
  const res = await axiosClient.post("/admin/media/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getMedia(params?: { type?: string; usedInRefType?: string }) {
  const res = await axiosClient.get("/admin/media", { params });
  return res.data;
}

export async function deleteMedia(id: string) {
  const res = await axiosClient.delete(`/admin/media/${id}`);
  return res.data;
}

// Uploaded files are served at GET /uploads/<filename>, a top-level static
// path (NOT under /api) — strip the /api suffix from the API base URL to
// get the origin the "url" field (a bare relative path) resolves against.
export function resolveMediaUrl(url: string): string {
  if (!url) return url;
  const base = (import.meta.env.VITE_API_BASE_URL as string) ?? "";
  const origin = base.replace(/\/api\/?$/, "");
  // If the stored URL is already absolute, strip its origin and re-resolve
  // against the configured base so local dev always hits localhost instead of
  // whatever host was set when the file was uploaded.
  const path = /^https?:\/\//.test(url) ? new URL(url).pathname : url;
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}
