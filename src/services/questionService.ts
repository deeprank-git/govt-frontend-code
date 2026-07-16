import { axiosClient } from "@/api/axiosClient";

export type Question = {
  id: string;
  test: string;
  questionText: string;
  options: { key: string; text: string }[];
  correctAnswer?: string;
  explanation?: string;
  marks?: number;
  negativeMarks?: number;
  [key: string]: unknown;
};

export async function getQuestions(testId: string) {
  const res = await axiosClient.get("/questions", { params: { test: testId } });
  return res.data;
}

export async function getQuestionsAdmin(testId: string) {
  const res = await axiosClient.get("/admin/questions", { params: { test: testId } });
  return res.data;
}

export async function createQuestion(data: Partial<Question>) {
  const res = await axiosClient.post("/admin/questions", data);
  return res.data;
}

export async function bulkCreateQuestions(dataArray: Partial<Question>[]) {
  const res = await axiosClient.post("/admin/questions/bulk", dataArray);
  return res.data;
}

export async function updateQuestion(id: string, data: Partial<Question>) {
  const res = await axiosClient.patch(`/admin/questions/${id}`, data);
  return res.data;
}

export async function deleteQuestion(id: string) {
  const res = await axiosClient.delete(`/admin/questions/${id}`);
  return res.data;
}
