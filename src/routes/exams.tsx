import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Search, BookOpen, Users as UsersIcon, FileText, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { ExamIcon } from "@/components/site/ExamIcon";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/exams")({
  head: () => ({
    meta: [
      { title: "All Government Exams — GovtPrep" },
      { name: "description", content: "Browse 150+ government exams across SSC, Banking, Railways, UPSC, Defence, State PSC and more." },
      { property: "og:title", content: "All Government Exams — GovtPrep" },
      { property: "og:description", content: "Find the right exam, syllabus and free mock tests." },
    ],
  }),
  component: ExamsPage,
});

const STATS = [
  { icon: BookOpen, value: "150+", label: "Exams" },
  { icon: UsersIcon, value: "50,000+", label: "Students Preparing" },
  { icon: FileText, value: "1,000+", label: "Mock Tests" },
  { icon: Sparkles, value: "100%", label: "Free for All" },
];

function ExamsPage() {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });
  const { data: exams = [] } = useQuery({
    queryKey: ["exams"],
    queryFn: async () =>
      (
        await supabase
          .from("exams")
          .select("id,slug,name,short_name,category_id,test_count,conducting_body")
          .order("name")
      ).data ?? [],
  });

  const filtered = useMemo(() => {
    return exams.filter((e) => {
      if (activeCat && e.category_id !== activeCat) return false;
      if (q && !(e.name + e.short_name).toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [exams, activeCat, q]);

  return (
    <SiteShell>
      <div className="container mx-auto px-4 lg:px-6 pt-6 pb-16">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Exams", to: "/exams" }, { label: "All Exams" }]} />

        <div className="mt-6 grid lg:grid-cols-[1fr_auto] gap-6 items-start">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-extrabold">All Exams</h1>
            <p className="mt-2 text-muted-foreground">
              Explore and prepare for 150+ government exams across different categories.
            </p>
          </div>
          <Card className="p-3 sm:p-4 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
            {STATS.map((s) => (
              <div key={s.label} className="flex items-center gap-2.5">
                <span className="h-9 w-9 grid place-items-center rounded-md bg-primary/10 text-primary"><s.icon className="h-4 w-4" /></span>
                <div>
                  <div className="font-display font-bold text-base leading-tight">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div className="mt-8 grid lg:grid-cols-[260px_1fr] gap-6">
          {/* Sidebar */}
          <Card className="p-4 h-fit">
            <h3 className="font-display font-semibold mb-3 text-sm">Exam Categories</h3>
            <button
              onClick={() => setActiveCat(null)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between",
                !activeCat ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
              )}
            >
              All Exams <span className="text-xs text-muted-foreground">{exams.length}</span>
            </button>
            {categories.map((c) => {
              const count = exams.filter((e) => e.category_id === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between mt-0.5",
                    activeCat === c.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  )}
                >
                  {c.name}
                  <span className="text-xs text-muted-foreground">{count}+</span>
                </button>
              );
            })}
          </Card>

          {/* List */}
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
              <h2 className="font-display font-bold text-lg">{filtered.length}+ Government Exams</h2>
              <div className="relative md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exam name…" className="pl-9" />
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No exams match your filters.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map((e, i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2), duration: 0.25 }}
                    whileHover={{ y: -3 }}
                  >
                    <Link to="/exams/$slug" params={{ slug: e.slug }} className="group block">
                      <div className="rounded-lg border border-border p-3 flex items-center gap-3 hover:border-primary hover:shadow-elevate transition">
                        <ExamIcon name={e.short_name ?? e.name} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{e.short_name ?? e.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{e.test_count ?? 0} Tests</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </SiteShell>
  );
}
