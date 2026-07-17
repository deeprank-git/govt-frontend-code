import axiosClient from "@/api/axiosClient";

export async function getMe() {
  const res = await axiosClient.get("/users/me");
  return res.data;
}

export async function updateMe(data: { name?: string; email?: string; password?: string }) {
  const res = await axiosClient.put("/users/me", data);
  return res.data;
}

export async function getAllUsers(params?: { role?: string; isActive?: boolean }) {
  const res = await axiosClient.get("/admin/users", { params });
  return res.data;
}

export async function getUserById(id: string) {
  const res = await axiosClient.get(`/admin/users/${id}`);
  return res.data;
}

export async function updateUserByAdmin(id: string, data: Partial<{ role: string; isActive: boolean; name: string; email: string }>) {
  const res = await axiosClient.patch(`/admin/users/${id}`, data);
  return res.data;
}
