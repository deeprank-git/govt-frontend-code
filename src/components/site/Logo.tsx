import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({
  size = "h-9",
  boxClassName,
}: {
  /** Tailwind height utility for the logo image — sized per call site to fit its container. */
  size?: string;
  /** Extra classes for the bordered box (e.g. padding so a taller logo isn't cramped against the border). */
  boxClassName?: string;
}) {
  return (
    <Link
      to="/"
      className={cn("flex items-center justify-center group", boxClassName)}
    >
      <img src="/docs/testopy-logo.png" alt="GovtPrep" className={cn(size, "w-auto object-contain")} />
    </Link>
  );
}
