import { seoHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ROADMAP } from "@/lib/dsa-data";
import { awardActivity } from "@/lib/gamification";

export const Route = createFileRoute("/roadmap")({
  head: () => seoHead({ path: "/roadmap", title: "DSA Learning Roadmap | Codex", description: "Follow a topic-by-topic data structures and algorithms roadmap — arrays to graphs and dynamic programming — and track every topic you complete.", ogTitle: "DSA Learning Roadmap | Codex", ogDescription: "A topic-by-topic DSA roadmap from arrays to dynamic programming, with progress tracking." }),
  component: () => (
    <DashboardLayout>
      <Roadmap />
    </DashboardLayout>
  ),
});

function Roadmap() {
  const { user } = useAuth();
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase
      .from("dsa_progress")
      .select("topic,completed")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setDone(new Set(data.filter((d) => d.completed).map((d) => d.topic)));
      });
  }, [user]);

  const toggle = async (topic: string) => {
    if (!user) return;
    const isDone = done.has(topic);
    const next = new Set(done);
    if (isDone) next.delete(topic); else next.add(topic);
    setDone(next);
    await supabase.from("dsa_progress").upsert(
      { user_id: user.id, topic, completed: !isDone, updated_at: new Date().toISOString() },
      { onConflict: "user_id,topic" }
    );
    if (!isDone) await awardActivity("topic_complete", { topic });
  };

  const pct = Math.round((done.size / ROADMAP.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">DSA Roadmap</h1>
        <p className="text-sm text-muted-foreground">Climb from arrays to graphs. Tick topics as you master them.</p>
      </div>
      <Card className="p-5">
        <div className="flex items-center justify-between text-sm">
          <span>Overall progress</span>
          <span className="font-medium">{done.size}/{ROADMAP.length} · {pct}%</span>
        </div>
        <Progress value={pct} className="mt-3" />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ROADMAP.map((r, i) => {
          const completed = done.has(r.topic);
          return (
            <Card key={r.topic} className={`p-5 transition ${completed ? "border-primary bg-primary/5" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">Step {i + 1}</span>
                  <h2 className="font-display text-xl">{r.topic}</h2>
                </div>
                <Button size="sm" variant={completed ? "default" : "outline"} onClick={() => toggle(r.topic)}>
                  {completed ? <><Check className="size-3.5 mr-1" /> Done</> : "Mark done"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{r.summary}</p>
              <ul className="mt-3 text-sm space-y-1 text-muted-foreground list-disc pl-5">
                {r.items.map((it) => <li key={it}>{it}</li>)}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
