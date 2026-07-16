import { axiosClient } from "@/api/axiosClient";

export type TestSeries = {
  id: string;
  title: string;
  category?: string;
  isPublished?: boolean;
  isActive?: boolean;
  totalTests?: number;
  [key: string]: unknown;
};

export async function getTestSeries(params?: { category?: string }) {
  const res = await axiosClient.get("/test-series", { params });
  return res.data;
}

export async function getTestSeriesById(id: string) {
  const res = await axiosClient.get(`/test-series/${id}`);
  return res.data;
}

export async function createTestSeries(data: Partial<TestSeries>) {
  const res = await axiosClient.post("/admin/test-series", data);
  return res.data;
}

export async function updateTestSeries(id: string, data: Partial<TestSeries>) {
  const res = await axiosClient.patch(`/admin/test-series/${id}`, data);
  return res.data;
}

export async function deleteTestSeries(id: string) {
  const res = await axiosClient.delete(`/admin/test-series/${id}`);
  return res.data;
}
