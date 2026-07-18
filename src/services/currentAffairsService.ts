import axiosClient from "@/api/axiosClient";

export async function getCurrentAffairs(params?: { date?: string; category?: string; q?: string; limit?: number }) {
  const res = await axiosClient.get("/current-affairs", { params });
  return res.data;
}

export async function getCurrentAffairById(id: string) {
  const res = await axiosClient.get(`/current-affairs/${id}`);
  return res.data;
}

export async function createCurrentAffair(data: {
  title: string;
  content: string;
  summary?: string;
  date?: string;
  category?: string;
  tags?: string[];
  image?: string;
  isPublished?: boolean;
}) {
  const res = await axiosClient.post("/admin/current-affairs", data);
  return res.data;
}

export async function updateCurrentAffair(id: string, data: Partial<{
  title: string;
  content: string;
  summary: string;
  date: string;
  category: string;
  tags: string[];
  image: string;
  isPublished: boolean;
}>) {
  const res = await axiosClient.patch(`/admin/current-affairs/${id}`, data);
  return res.data;
}

export async function deleteCurrentAffair(id: string) {
  const res = await axiosClient.delete(`/admin/current-affairs/${id}`);
  return res.data;
}
