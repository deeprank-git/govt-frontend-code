import axiosClient from "@/api/axiosClient";

export async function getQuestionsByTest(testId: string) {
  const res = await axiosClient.get("/questions", { params: { test: testId } });
  return res.data;
}

export async function getQuestionsAdmin(testId?: string) {
  const res = await axiosClient.get("/admin/questions", { params: testId ? { test: testId } : undefined });
  return res.data;
}

export async function createQuestion(data: Record<string, unknown>) {
  const res = await axiosClient.post("/admin/questions", data);
  return res.data;
}

export async function bulkCreateQuestions(data: Record<string, unknown>[]) {
  const res = await axiosClient.post("/admin/questions/bulk", data);
  return res.data;
}

export async function updateQuestion(id: string, data: Record<string, unknown>) {
  const res = await axiosClient.patch(`/admin/questions/${id}`, data);
  return res.data;
}

export async function deleteQuestion(id: string) {
  const res = await axiosClient.delete(`/admin/questions/${id}`);
  return res.data;
}
