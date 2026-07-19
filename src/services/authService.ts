import axiosClient from "@/api/axiosClient";
import { setAuth, clearAuth, getRefreshToken, type AuthUser } from "@/lib/auth-store";

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

function persistFromResponse(data: unknown) {
  const payload = data as { token?: string; refreshToken?: string; user?: AuthUser };
  if (payload?.token && payload?.user) setAuth(payload.token, payload.user, payload.refreshToken);
}

export async function register(data: RegisterInput) {
  const res = await axiosClient.post("/auth/register", data);
  persistFromResponse(res.data);
  return res.data;
}

export async function login(data: LoginInput) {
  const res = await axiosClient.post("/auth/login", data);
  persistFromResponse(res.data);
  return res.data;
}

export function logout() {
  const refreshToken = getRefreshToken();
  clearAuth();
  if (refreshToken) {
    axiosClient.post("/auth/logout", { refreshToken }).catch(() => {});
  }
}