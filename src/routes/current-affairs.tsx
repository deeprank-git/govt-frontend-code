import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Bookmark, ChevronRight, Flame, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/current-affairs")({
  head: () => ({
    meta: [
      { title: "Current Affairs — SSC, Banking, UPSC | GovtPrep" },
      { name: "description", content: "Stay updated with the latest current affairs for SSC, Banking, Railways, UPSC, State PSC, Defence and other government exams." },
      { property: "og:title", content: "Latest Current Affairs — GovtPrep" },
      { property: "og:description", content: "Daily news, monthly PDFs, quizzes and trending topics for government exam aspirants." },
    ],
  }),
  component: CAPage,
});

const TABS = ["All", "National", "International", "Economy", "Science & Tech", "Sports", "Awards", "Defence"];

function CAPage() {
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");

  const { data: articles = [] } = useQuery({
    queryKey: ["current-affairs"],
    queryFn: async () => (await supabase.from("current_affairs").select("*").order("published_at", { ascending: false })).data ?? [],
  });

  const filtered = articles.filter((a) => {
    if (tab !== "All" && a.category !== tab) return false;
    if (q && !a.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const top = filtered.filter((a) => a.is_featured).slice(0, 5);
  const rest = filtered.filter((a) => !top.includes(a));

  return (
    <SiteShell>
      <section className="bg-hero-radial">
        <div className="container mx-auto px-4 lg:px-6 pt-6 pb-14">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Current Affairs" }]} />
          <div className="mt-6 grid lg:grid-cols-[1fr_360px] items-center gap-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-extrabold">Current Affairs</h1>
              <p className="mt-2 text-muted-foreground max-w-xl">
                Stay updated with the latest current affairs for SSC, Banking, Railway, UPSC, State PSC, Defence and other Government Exams.
              </p>
              <form className="mt-5 relative max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search current affairs…" className="pl-9 h-11 pr-24 bg-background" />
                <Button size="sm" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8">Search</Button>
              </form>
            </div>
            <div className="hidden lg:flex items-center justify-center">
              <div className="h-44 w-44 rounded-full bg-primary/10 grid place-items-center">
                <span className="text-6xl">🌐</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 lg:px-6 py-10">
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 rounded-full text-sm border transition",
                tab === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          <div>
            <h2 className="font-display font-bold text-xl mb-4">Today's Top News</h2>
            <div className="space-y-4">
              {top.map((a) => (
                <Card key={a.id} className="p-4 flex flex-col sm:flex-row gap-4 hover:shadow-elevate transition">
                  <div className="sm:w-44 h-40 sm:h-32 rounded-lg bg-gradient-to-br from-primary/20 via-primary/5 to-secondary grid place-items-center text-3xl shrink-0">
                    📰
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge className="bg-primary/15 text-primary border-transparent">{a.category}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.published_at).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-lg leading-snug">{a.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.summary}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <button className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary"><Bookmark className="h-3.5 w-3.5" />Save</button>
                      <Link to="/current-affairs" className="text-xs text-primary hover:underline">Read More →</Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <h2 className="font-display font-bold text-xl mt-10 mb-4">Latest Updates</h2>
            <Card className="divide-y divide-border">
              {rest.map((a) => (
                <div key={a.id} className="p-4 flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">{a.category}</Badge>
                  <div className="flex-1">
                    <div className="font-semibold">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(a.published_at).toLocaleDateString()}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2"><Flame className="h-5 w-5 text-warning" /><h3 className="font-display font-bold">Current Affairs Streak</h3></div>
              <div className="text-3xl font-display font-extrabold mt-1">18 Days</div>
              <p className="text-xs text-muted-foreground">Great going. Keep it up!</p>
              <div className="mt-4 flex gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <span key={i} className="h-7 flex-1 rounded-md bg-success/20 grid place-items-center text-success-foreground text-[10px] font-semibold">{["M","T","W","T","F","S","S"][i]}</span>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3"><TrendingUp className="h-5 w-5 text-primary" /><h3 className="font-display font-bold">Trending Topics</h3></div>
              <ul className="space-y-2 text-sm">
                {["General Awareness 2024", "Indian Economy", "ISRO Missions", "International Relations", "Climate Change"].map((t) => (
                  <li key={t} className="flex items-center justify-between">
                    <span>{t}</span>
                    <span className="text-xs text-muted-foreground">128 articles</span>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
