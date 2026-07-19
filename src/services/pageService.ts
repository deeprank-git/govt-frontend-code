import axiosClient from "@/api/axiosClient";

export async function getPageBySlug(slug: string) {
  const res = await axiosClient.get(`/pages/${slug}`);
  return res.data;
}

export async function adminGetPages(params?: { status?: "draft" | "published" }) {
  const res = await axiosClient.get("/admin/pages", { params });
  return res.data;
}

export async function createPage(data: { slug: string; title: string; content: string; status?: "draft" | "published" }) {
  const res = await axiosClient.post("/admin/pages", data);
  return res.data;
}

export async function updatePage(id: string, data: Partial<{ title: string; content: string; status: "draft" | "published" }>) {
  const res = await axiosClient.patch(`/admin/pages/${id}`, data);
  return res.data;
}

export async function deletePage(id: string) {
  const res = await axiosClient.delete(`/admin/pages/${id}`);
  return res.data;
}
