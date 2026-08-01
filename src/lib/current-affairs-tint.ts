export const CAT_TINT: Record<string, { bg: string; text: string }> = {
  Polity: { bg: "bg-violet-100", text: "text-violet-700" },
  Economy: { bg: "bg-amber-100", text: "text-amber-700" },
  "Indian Economy": { bg: "bg-orange-100", text: "text-orange-700" },
  "International Affairs": { bg: "bg-blue-100", text: "text-blue-700" },
  International: { bg: "bg-blue-100", text: "text-blue-700" },
  "Science & Tech": { bg: "bg-cyan-100", text: "text-cyan-700" },
  Environment: { bg: "bg-emerald-100", text: "text-emerald-700" },
  Sports: { bg: "bg-rose-100", text: "text-rose-700" },
  Awards: { bg: "bg-pink-100", text: "text-pink-700" },
  Reports: { bg: "bg-indigo-100", text: "text-indigo-700" },
  National: { bg: "bg-orange-100", text: "text-orange-700" },
};

export function tintFor(cat: string) {
  return CAT_TINT[cat] ?? { bg: "bg-primary/10", text: "text-primary" };
}
