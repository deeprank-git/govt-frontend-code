import { cn } from "@/lib/utils";

// Deterministic accent palette so each exam gets a stable badge color.
const PALETTE = [
  "bg-red-100 text-red-700",
  "bg-green-100 text-green-700",
  "bg-blue-100 text-blue-700",
  "bg-amber-100 text-amber-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function ExamIcon({ name, className }: { name: string; className?: string }) {
  const tone = PALETTE[hashStr(name) % PALETTE.length];
  const letters = name
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={cn(
        "h-10 w-10 grid place-items-center rounded-full font-display font-bold text-sm shrink-0",
        tone,
        className
      )}
    >
      {letters}
    </div>
  );
}
