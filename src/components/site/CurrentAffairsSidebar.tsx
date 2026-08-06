import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Flame, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as currentAffairsService from "@/services/currentAffairsService";
import type { CurrentAffairsStreak } from "@/services/currentAffairsService";
import { unwrapItem } from "@/lib/api-unwrap";

// Digest subscribe + Streak cards — shared between the main Current Affairs
// dashboard page and the Bookmarked Current Affairs page so both keep an
// identical sidebar instead of two copies drifting apart.
export function CurrentAffairsSidebar() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const { data: streakRes, isLoading: streakLoading } = useQuery({
    queryKey: ["current-affairs-streak"],
    queryFn: () => currentAffairsService.getCurrentAffairsStreak(),
  });
  const streak = unwrapItem<CurrentAffairsStreak>(streakRes);
  const currentStreak = streak?.currentStreak ?? 0;
  const weekActivity = streak?.weekActivity ?? [];

  // Compare against the previously *fetched* value (in state), not
  // localStorage — only toast when we've actually observed the streak climb
  // during this session, not just because it's already > 0 on first load.
  const prevStreakRef = useRef<number | null>(null);
  useEffect(() => {
    if (!streak) return;
    const prev = prevStreakRef.current;
    if (prev !== null && streak.currentStreak > prev) {
      toast.success(`🔥 ${streak.currentStreak}-day streak! Keep it up.`);
    }
    prevStreakRef.current = streak.currentStreak;
  }, [streak]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    toast.success("Subscribed! Check your inbox tomorrow.");
  };

  return (
    <>
      {/* <Card className="p-4 bg-gradient-to-br from-primary/5 to-blue-500/5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-display font-bold text-sm">Daily Current Affairs Digest</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Get handpicked important news delivered to your inbox daily.</p>
          </div>
          <Mail className="h-8 w-8 text-primary/40" />
        </div>
        <form onSubmit={handleSubscribe} className="mt-2 space-y-2">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-8 text-xs"
            required
          />
          <Button type="submit" size="sm" className="w-full">
            {subscribed ? <><Check className="mr-1 h-3.5 w-3.5" />Subscribed</> : "Subscribe"}
          </Button>
        </form>
      </Card> */}

      <Card className="p-4">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <span className="h-4 w-1 bg-primary rounded-full" /> Current Affairs Streak
        </h3>

        {streakLoading ? (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <Skeleton className="h-2.5 w-3" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mt-3">
              <div className={cn("h-12 w-12 rounded-xl grid place-items-center", currentStreak > 0 ? "bg-orange-100" : "bg-muted")}>
                <Flame className={cn("h-6 w-6", currentStreak > 0 ? "text-orange-500" : "text-muted-foreground")} />
              </div>
              {currentStreak > 0 ? (
                <div>
                  <div className="text-lg font-display font-extrabold">{currentStreak} Days</div>
                  <div className="text-[11px] text-muted-foreground">Great going! Keep it up!</div>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-semibold">Start your streak today!</div>
                  <div className="text-[11px] text-muted-foreground">Read a current affair to begin.</div>
                </div>
              )}
            </div>
            {weekActivity.length > 0 && (
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {weekActivity.map((d) => (
                  <div key={d.date} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{d.label}</span>
                    <div className={cn("h-6 w-6 rounded-full grid place-items-center text-[10px]", d.completed ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}>
                      {d.completed && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
