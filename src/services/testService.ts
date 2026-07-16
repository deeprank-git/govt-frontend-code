import { axiosClient } from "@/api/axiosClient";

export type Test = {
  id: string;
  title: string;
  category?: string;
  testSeries?: string;
  duration?: number;
  totalQuestions?: number;
  totalMarks?: number;
  isPublished?: boolean;
  isActive?: boolean;
  [key: string]: unknown;
};

export async function getTests(params?: { category?: string; testSeries?: string }) {
  const res = await axiosClient.get("/tests", { params });
  return res.data;
}

export async function getTestById(id: string) {
  const res = await axiosClient.get(`/tests/${id}`);
  return res.data;
}

export async function createTest(data: Partial<Test>) {
  const res = await axiosClient.post("/admin/tests", data);
  return res.data;
}

export async function updateTest(id: string, data: Partial<Test>) {
  const res = await axiosClient.patch(`/admin/tests/${id}`, data);
  return res.data;
}

export async function deleteTest(id: string) {
  const res = await axiosClient.delete(`/admin/tests/${id}`);
  return res.data;
}
