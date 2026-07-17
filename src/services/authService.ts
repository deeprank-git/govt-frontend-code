import axiosClient from "@/api/axiosClient";

export async function register(data: { name: string; email: string; password: string; role?: string }) {
  const res = await axiosClient.post("/auth/register", data);
  return res.data;
}

export async function login(data: { email: string; password: string }) {
  const res = await axiosClient.post("/auth/login", data);
  return res.data;
}
