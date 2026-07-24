import axiosClient from "@/api/axiosClient";

export async function getMe() {
  const res = await axiosClient.get("/users/me");
  return res.data;
}

// PUT /users/me is multipart/form-data (see GovtPrep-Backend-Workflow-and-Status.md
// §2) so a profile-picture file can ride along with the rest of the fields in
// one request.
export async function updateMe(data: {
  name?: string;
  email?: string;
  mobile?: string;
  username?: string;
  address?: string;
  country?: string;
  city?: string;
  password?: string;
  profilePicture?: File;
}) {
  const form = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== "") form.append(key, value);
  });
  const res = await axiosClient.put("/users/me", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
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

export async function updateUserByAdmin(id: string, data: Partial<{ role: string; isActive: boolean; name: string; email: string; mobile: string }>) {
  const res = await axiosClient.patch(`/admin/users/${id}`, data);
  return res.data;
}
