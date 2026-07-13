import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <span className="grid place-items-center h-9 w-9 rounded-xl bg-primary text-primary-foreground shadow-elevate">
        <GraduationCap className="h-5 w-5" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display font-bold text-[1.15rem] tracking-tight text-foreground">
            GovtPrep
          </span>
          <span className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
            Prepare. Practice. Succeed.
          </span>
        </span>
      )}
    </Link>
  );
}
