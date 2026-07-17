import { useEffect, useState } from "react";
import { getToken, getUser, type AuthUser } from "@/lib/auth-store";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sync = () => {
      setUser(getToken() ? getUser() : null);
      setLoading(false);
    };
    sync();
    window.addEventListener("gp-auth-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("gp-auth-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { user, loading };
}
