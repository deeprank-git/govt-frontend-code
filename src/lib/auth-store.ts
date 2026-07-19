export type Role = "student" | "instructor" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
};

const TOKEN_KEY = "gp_token";
const USER_KEY = "gp_user";
const REFRESH_TOKEN_KEY = "gp_refresh_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: AuthUser, refreshToken?: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  window.dispatchEvent(new Event("gp-auth-change"));
}

// Updates just the access/refresh token pair after a silent refresh — the
// user identity hasn't changed, so no gp-auth-change event is needed here.
export function setTokens(token: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.dispatchEvent(new Event("gp-auth-change"));
}

export function getRole(): Role | null {
  return getUser()?.role ?? null;
}

export function isAdmin(): boolean {
  return getRole() === "admin";
}
