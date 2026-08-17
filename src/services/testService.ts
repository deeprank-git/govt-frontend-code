import axiosClient from "@/api/axiosClient";

export async function getTests(params?: { category?: string; testSeries?: string; isActive?: boolean; isPublished?: boolean; paperType?: "mock" | "previous_year"; year?: number | string; search?: string }) {
  const res = await axiosClient.get("/tests", { params });
  return res.data;
}

export async function getTestById(id: string) {
  const res = await axiosClient.get(`/tests/${id}`);
  return res.data;
}

export async function createTest(data: Record<string, unknown>) {
  const res = await axiosClient.post("/admin/tests", data);
  return res.data;
}

export async function createTestWithQuestions(data: Record<string, unknown>) {
  const res = await axiosClient.post("/admin/tests/with-questions", data);
  return res.data;
}

export async function updateTest(id: string, data: Record<string, unknown>) {
  const res = await axiosClient.patch(`/admin/tests/${id}`, data);
  return res.data;
}

export async function deleteTest(id: string) {
  const res = await axiosClient.delete(`/admin/tests/${id}`);
  return res.data;
}
