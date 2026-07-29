import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({
  size = "h-9",
  boxClassName,
  to = "/",
}: {
  /** Tailwind height utility for the logo image — sized per call site to fit its container. */
  size?: string;
  /** Extra classes for the bordered box (e.g. padding so a taller logo isn't cramped against the border). */
  boxClassName?: string;
  /** Where the logo links to. Public pages use "/"; in-app contexts (sidebar) should
      link straight to "/dashboard" to skip the "/" -> "/dashboard/overview" redirect. */
  to?: "/" | "/dashboard";
}) {
  return (
    <Link
      to={to}
      className={cn("flex items-center justify-center group", boxClassName)}
    >
      <img src="/docs/testopy-logo.png" alt="GovtPrep" className={cn(size, "w-auto object-contain")} />
    </Link>
  );
}
