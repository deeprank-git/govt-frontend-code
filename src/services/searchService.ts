import axiosClient from "@/api/axiosClient";

// Response is already grouped by type — not a flat list, so callers
// destructure res.data.data.* directly instead of using unwrapList/unwrapItem.
export async function search(q: string) {
  const res = await axiosClient.get("/search", { params: { q } });
  return res.data;
}
