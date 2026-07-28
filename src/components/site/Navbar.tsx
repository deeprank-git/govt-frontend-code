import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Menu, X, Bell, LogOut, LayoutDashboard, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/use-auth";
import * as authService from "@/services/authService";
import * as notificationService from "@/services/notificationService";
import * as searchService from "@/services/searchService";
import { unwrapList } from "@/lib/api-unwrap";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/exams" as const, label: "Exams" },
  { to: "/current-affairs" as const, label: "Current Affairs" },
  // { to: "/exam-info" as const, label: "Exam Info" },
  { to: "/about-us" as const, label: "About Us" },
];

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && query.trim()) navigate({ to: "/exams", search: { q: query } as never });
  };

  const showSearchResults = !!user && searchFocused && query.trim().length > 1;
  const { data: searchRes } = useQuery({
    queryKey: ["nav-search", query],
    queryFn: () => searchService.search(query.trim()),
    enabled: showSearchResults,
  });
  const searchGroups = searchRes?.data as
    | { categories: any[]; tests: any[]; testSeries: any[]; currentAffairs: any[] }
    | undefined;

  const { data: notifRes } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => notificationService.getMyNotifications({ limit: 10 }),
    enabled: !!user,
  });
  const notifications = unwrapList<any>(notifRes);
  const unreadCount = notifRes?.unreadCount ?? 0;

  const onNotificationClick = async (id: string) => {
    try {
      await notificationService.markNotificationRead(id);
      qc.invalidateQueries({ queryKey: ["my-notifications"] });
    } catch {
      // non-critical — ignore
    }
  };

  const initials = (user?.name || user?.email || "U")
    .split(/[\s@]/)[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto px-4 lg:px-6 h-16 flex items-center gap-4">
        <Logo />

        {/* flex-1 + justify-center so the links sit centered in the remaining
            space between the logo and the right-side actions, instead of
            hugging the logo (there's no search form left to eat that space —
            see below). */}
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition",
                  active
                    ? "text-primary"
                    : "text-foreground/75 hover:text-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Search bar disabled for now — kept here commented out in case it's
            reinstated. Supporting state/handlers below are left in place too
            since they don't cause build errors when unused.
        <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-md ml-auto relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder="Search exams, mock tests, notes…"
            className="pl-9 h-10 bg-muted/40 border-transparent focus-visible:bg-background"
          />
          {showSearchResults && searchGroups && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-elevate max-h-96 overflow-y-auto z-50 text-sm">
              {searchRes?.totalResults === 0 && (
                <div className="p-4 text-muted-foreground text-xs">No results for "{query}".</div>
              )}
              {(["categories", "tests", "testSeries", "currentAffairs"] as const).map((key) => {
                const label = { categories: "Categories", tests: "Tests", testSeries: "Test Series", currentAffairs: "Current Affairs" }[key];
                const rows = searchGroups[key] ?? [];
                if (rows.length === 0) return null;
                return (
                  <div key={key} className="p-2 border-b border-border last:border-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2 py-1">{label}</div>
                    {rows.map((r: any) => (
                      <div key={r._id} className="px-2 py-1.5 rounded hover:bg-muted/60">
                        <div className="font-medium truncate">{r.name ?? r.title}</div>
                        {(r.description ?? r.summary) && (
                          <div className="text-xs text-muted-foreground truncate">{r.description ?? r.summary}</div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
              <div className="p-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/exams", search: { q: query } as never })}
                  className="text-xs text-primary hover:underline w-full text-left px-2"
                >
                  See all results for "{query}" →
                </button>
              </div>
            </div>
          )}
        </form>
        */}

        {/* ml-auto (not just md:ml-0) since the search form that used to
            provide this right-push at md+ is commented out above. */}
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="relative" aria-label="Notifications">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 && (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">No notifications yet.</div>
                  )}
                  {notifications.map((n) => (
                    <DropdownMenuItem
                      key={n._id}
                      onSelect={() => onNotificationClick(n._id)}
                      className={cn("flex flex-col items-start gap-0.5 whitespace-normal", !n.isRead && "bg-primary/5")}
                    >
                      <span className={cn("text-sm", !n.isRead && "font-semibold")}>{n.title}</span>
                      <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-muted transition">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium">
                      {user.name?.split(" ")[0] ?? "Aspirant"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium">{user.name ?? "Aspirant"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate({ to: "/dashboard" })}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate({ to: "/dashboard/profile" })}>
                    <UserIcon className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      authService.logout();
                      navigate({ to: "/" });
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => navigate({ to: "/auth", search: { mode: "login" } as never })}
              >
                Login
              </Button>
              <Button
                onClick={() => navigate({ to: "/auth", search: { mode: "signup" } as never })}
              >
                Sign Up
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
            {!user && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate({ to: "/auth", search: { mode: "login" } as never })}
                >
                  Login
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => navigate({ to: "/auth", search: { mode: "signup" } as never })}
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
