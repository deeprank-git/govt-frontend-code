import axiosClient from "@/api/axiosClient";

export async function reportQuestion(data: { questionId: string; reason: string }) {
  const res = await axiosClient.post("/users/me/report-question", data);
  return res.data;
}

export async function adminGetReports(params?: { status?: "pending" | "reviewed" | "resolved" }) {
  const res = await axiosClient.get("/admin/reports", { params });
  return res.data;
}

export async function adminUpdateReport(id: string, data: Partial<{ status: "pending" | "reviewed" | "resolved"; adminNote: string }>) {
  const res = await axiosClient.patch(`/admin/reports/${id}`, data);
  return res.data;
}
