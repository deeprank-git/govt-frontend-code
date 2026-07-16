export type AuthUser = {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: "student" | "instructor" | "admin";
  isActive?: boolean;
  [key: string]: unknown;
};

type AuthState = { token: string | null; user: AuthUser | null };

const STORAGE_KEY = "gp_auth";
const EMPTY_STATE: AuthState = { token: null, user: null };

function readFromStorage(): AuthState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    return { token: parsed.token ?? null, user: parsed.user ?? null };
  } catch {
    return EMPTY_STATE;
  }
}

let state: AuthState = readFromStorage();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getAuthState(): AuthState {
  return state;
}

export function getToken(): string | null {
  return state.token;
}

export function getStoredUser(): AuthUser | null {
  return state.user;
}

export function setAuth(token: string, user: AuthUser) {
  state = { token, user };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  emit();
}

export function clearAuth() {
  state = EMPTY_STATE;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  emit();
}

export function subscribeAuth(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
