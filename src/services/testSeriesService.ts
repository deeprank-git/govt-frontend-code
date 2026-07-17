import axiosClient from "@/api/axiosClient";

export async function getTestSeries(params?: { category?: string; isActive?: boolean; isPublished?: boolean }) {
  const res = await axiosClient.get("/test-series", { params });
  return res.data;
}

export async function getTestSeriesById(id: string) {
  const res = await axiosClient.get(`/test-series/${id}`);
  return res.data;
}

export async function createTestSeries(data: Record<string, unknown>) {
  const res = await axiosClient.post("/admin/test-series", data);
  return res.data;
}

export async function updateTestSeries(id: string, data: Record<string, unknown>) {
  const res = await axiosClient.patch(`/admin/test-series/${id}`, data);
  return res.data;
}

export async function deleteTestSeries(id: string) {
  const res = await axiosClient.delete(`/admin/test-series/${id}`);
  return res.data;
}
