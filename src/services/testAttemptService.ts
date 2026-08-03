import axiosClient from "@/api/axiosClient";

export async function startTest(testId: string) {
  const res = await axiosClient.post("/test-attempts/start", { testId });
  return res.data;
}

export async function getQuestionByIndex(attemptId: string, index: number) {
  const res = await axiosClient.get(`/test-attempts/${attemptId}/question/${index}`);
  return res.data;
}

export async function saveAnswer(data: { attemptId: string; questionId: string; selectedOption: number }) {
  const res = await axiosClient.post("/test-attempts/save-answer", data);
  return res.data;
}

export async function submitTest(attemptId: string) {
  const res = await axiosClient.post("/test-attempts/submit", { attemptId });
  return res.data;
}

export async function pauseTest(attemptId: string) {
  const res = await axiosClient.post(`/test-attempts/${attemptId}/pause`);
  return res.data;
}

export async function resumeTest(attemptId: string) {
  const res = await axiosClient.post(`/test-attempts/${attemptId}/resume`);
  return res.data;
}

export async function getResult(attemptId: string) {
  const res = await axiosClient.get(`/test-attempts/${attemptId}/result`);
  return res.data;
}

export async function getMyAttempts() {
  const res = await axiosClient.get("/test-attempts/my-attempts");
  return res.data;
}
