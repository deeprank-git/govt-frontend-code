import axiosClient from "@/api/axiosClient";

export async function getCategories() {
  const res = await axiosClient.get("/categories");
  return res.data;
}

export async function getCategoryById(id: string) {
  const res = await axiosClient.get(`/categories/${id}`);
  return res.data;
}

export async function createCategory(data: { name: string; description?: string; image?: string }) {
  const res = await axiosClient.post("/admin/categories", data);
  return res.data;
}

export async function updateCategory(id: string, data: Partial<{ name: string; description: string; image: string; isActive: boolean }>) {
  const res = await axiosClient.patch(`/admin/categories/${id}`, data);
  return res.data;
}

export async function deleteCategory(id: string) {
  const res = await axiosClient.delete(`/admin/categories/${id}`);
  return res.data;
}
