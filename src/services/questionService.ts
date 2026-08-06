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

// POST /admin/questions/bulk is multipart/form-data — the server parses the
// CSV itself (see Testopy-Backend-Workflow-and-Status.md §7), so the raw
// file goes up as-is rather than a JSON array of parsed rows.
export async function bulkCreateQuestions(file: File | Blob, filename = "questions.csv") {
  const form = new FormData();
  form.append("file", file, filename);
  const res = await axiosClient.post("/admin/questions/bulk", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

// GET /admin/questions/bulk/template returns a real CSV file from the server.
export async function getBulkTemplateCsv() {
  const res = await axiosClient.get("/admin/questions/bulk/template", { responseType: "blob" });
  return res.data as Blob;
}

export async function updateQuestion(id: string, data: Record<string, unknown>) {
  const res = await axiosClient.patch(`/admin/questions/${id}`, data);
  return res.data;
}

export async function deleteQuestion(id: string) {
  const res = await axiosClient.delete(`/admin/questions/${id}`);
  return res.data;
}
