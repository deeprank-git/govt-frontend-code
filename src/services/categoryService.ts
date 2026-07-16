import { axiosClient } from "@/api/axiosClient";

export type Category = {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  [key: string]: unknown;
};

export async function getCategories() {
  const res = await axiosClient.get("/categories");
  return res.data;
}

export async function getCategoryById(id: string) {
  const res = await axiosClient.get(`/categories/${id}`);
  return res.data;
}

export async function createCategory(data: Partial<Category>) {
  const res = await axiosClient.post("/admin/categories", data);
  return res.data;
}

export async function updateCategory(id: string, data: Partial<Category>) {
  const res = await axiosClient.patch(`/admin/categories/${id}`, data);
  return res.data;
}

export async function deleteCategory(id: string) {
  const res = await axiosClient.delete(`/admin/categories/${id}`);
  return res.data;
}
