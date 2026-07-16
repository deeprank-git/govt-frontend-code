import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAuthState } from "@/lib/auth-store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { token, user } = getAuthState();
    if (!token || !user) {
      throw redirect({
        to: "/auth",
        search: { mode: "login", redirect: location.href } as never,
      });
    }
    return { user };
  },
  component: () => <Outlet />,
});
