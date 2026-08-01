import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Flame, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Digest subscribe + Streak cards — shared between the main Current Affairs
// dashboard page and the Bookmarked Current Affairs page so both keep an
// identical sidebar instead of two copies drifting apart.
export function CurrentAffairsSidebar() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Streak (simulated: 18-day)
  const streak = 18;
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date().getDay(); // 0 Sun..6 Sat
  const todayIdx = (today + 6) % 7; // M=0

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    toast.success("Subscribed! Check your inbox tomorrow.");
  };

  return (
    <>
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-blue-500/5">
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
      </Card>

      <Card className="p-4">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <span className="h-4 w-1 bg-primary rounded-full" /> Current Affairs Streak
        </h3>
        <div className="flex items-center gap-3 mt-3">
          <div className="h-12 w-12 rounded-xl bg-orange-100 grid place-items-center">
            <Flame className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <div className="text-lg font-display font-extrabold">{streak} Days</div>
            <div className="text-[11px] text-muted-foreground">Great going! Keep it up!</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {days.map((d, i) => {
            const done = i <= todayIdx;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{d}</span>
                <div className={cn("h-6 w-6 rounded-full grid place-items-center text-[10px]", done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}>
                  {done && <Check className="h-3 w-3" />}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
