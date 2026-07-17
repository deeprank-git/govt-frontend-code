import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getToken, getUser } from "@/lib/auth-store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: ({ location }) => {
    const token = getToken();
    const user = getUser();
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
