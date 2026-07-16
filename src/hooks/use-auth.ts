import { useSyncExternalStore } from "react";
import { subscribeAuth, getAuthState, type AuthUser } from "@/lib/auth-store";

const SERVER_SNAPSHOT = { token: null, user: null };

export function useAuth(): { user: AuthUser | null; token: string | null; loading: boolean } {
  const state = useSyncExternalStore(subscribeAuth, getAuthState, () => SERVER_SNAPSHOT);
  return { user: state.user, token: state.token, loading: false };
}
