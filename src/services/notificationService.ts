import axiosClient from "@/api/axiosClient";

export async function getMyNotifications(params?: { limit?: number }) {
  const res = await axiosClient.get("/notifications/me", { params });
  return res.data;
}

export async function markNotificationRead(id: string) {
  const res = await axiosClient.patch(`/notifications/${id}/read`);
  return res.data;
}

export async function adminSendNotification(data: {
  userId?: string;
  title: string;
  message: string;
  type?: "info" | "reminder" | "result" | "offer" | "system";
}) {
  const res = await axiosClient.post("/admin/notifications", data);
  return res.data;
}

export async function adminGetNotifications(params?: { limit?: number }) {
  const res = await axiosClient.get("/admin/notifications", { params });
  return res.data;
}
