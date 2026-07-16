import { axiosClient } from "@/api/axiosClient";
import { setAuth, clearAuth, type AuthUser } from "@/lib/auth-store";

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  mobile?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

// Envelope shape isn't documented beyond "returns a JWT" — support {token,user}
// either at the top level or nested under `data`.
function persistFromResponse(data: unknown) {
  const root = data as Record<string, unknown>;
  const payload = (root?.data as Record<string, unknown>) ?? root;
  const token = (payload?.token ?? payload?.accessToken) as string | undefined;
  const user = (payload?.user ?? (payload?.email ? payload : undefined)) as AuthUser | undefined;
  if (token && user) setAuth(token, user);
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
  clearAuth();
}
