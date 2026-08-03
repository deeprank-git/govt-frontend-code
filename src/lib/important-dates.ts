import { CalendarDays } from "lucide-react";

// Pinned locale so this renders identically during SSR and client hydration.
export const formatImportantDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// Cycled by index across however many date entries a series has, since
// entries are admin-defined free text with no fixed semantic per slot.
export const IMPORTANT_DATE_TINTS = [
  "bg-emerald-50 text-emerald-600",
  "bg-blue-50 text-blue-600",
  "bg-amber-50 text-amber-600",
  "bg-violet-50 text-violet-600",
  "bg-rose-50 text-rose-600",
  "bg-slate-50 text-slate-600",
];

export const ImportantDateIcon = CalendarDays;
