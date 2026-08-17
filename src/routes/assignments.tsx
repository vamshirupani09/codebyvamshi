import { seoHead, SITE_URL } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Bookmark, BookmarkCheck, Check } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { awardActivity } from "@/lib/gamification";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  problem_url: string;
  difficulty: string | null;
  week_number: number;
  due_date: string | null;
}

export const Route = createFileRoute("/assignments")({
  head: () => ({
    ...seoHead({
      path: "/assignments",
      title: "Weekly Coding Assignments | Codex",
      description:
        "Work through weekly coding problem sets, mark them complete, bookmark favourites and keep a steady DSA practice streak going.",
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Course",
          name: "Weekly Coding Assignments",
          url: `${SITE_URL}/assignments`,
          description:
            "A week-by-week set of curated coding problems that builds data structures and algorithms skills for placement interviews.",
          provider: { "@type": "Organization", name: "Codex", url: SITE_URL },
        }),
      },
    ],
  }),
  component: () => (
    <DashboardLayout>
      <Assignments />
    </DashboardLayout>
  ),
});

function Assignments() {
  const { user } = useAuth();
  const [list, setList] = useState<Assignment[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: a }, { data: c }, { data: b }] = await Promise.all([
        supabase.from("assignments").select("*").order("week_number").order("created_at"),
        supabase.from("assignment_completions").select("assignment_id").eq("user_id", user.id),
        supabase.from("bookmarks").select("problem_url").eq("user_id", user.id),
      ]);
      if (a) setList(a as Assignment[]);
      if (c) setDone(new Set(c.map((x) => x.assignment_id)));
      if (b) setBookmarks(new Set(b.map((x) => x.problem_url)));
    })();
  }, [user]);

  const grouped = useMemo(() => {
    const map = new Map<number, Assignment[]>();
    list.forEach((a) => {
      const arr = map.get(a.week_number) ?? [];
      arr.push(a);
      map.set(a.week_number, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [list]);

  const toggleDone = async (a: Assignment) => {
    if (!user) return;
    if (done.has(a.id)) {
      await supabase.from("assignment_completions").delete().eq("user_id", user.id).eq("assignment_id", a.id);
      setDone((p) => { const n = new Set(p); n.delete(a.id); return n; });
    } else {
      await supabase.from("assignment_completions").insert({ user_id: user.id, assignment_id: a.id });
      setDone((p) => new Set(p).add(a.id));
      await awardActivity("assignment_complete", { label: a.title });
      toast.success("Nice — assignment completed! +60 XP");
    }
  };

  const toggleBookmark = async (a: Assignment) => {
    if (!user) return;
    if (bookmarks.has(a.problem_url)) {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("problem_url", a.problem_url);
      setBookmarks((p) => { const n = new Set(p); n.delete(a.problem_url); return n; });
    } else {
      await supabase.from("bookmarks").insert({
        user_id: user.id,
        problem_title: a.title,
        problem_url: a.problem_url,
        topic: a.difficulty ?? "Assignment",
      });
      setBookmarks((p) => new Set(p).add(a.problem_url));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Weekly Assignments</h1>
        <p className="text-sm text-muted-foreground">Hand-picked LeetCode problems to keep your streak alive.</p>
      </div>
      {grouped.map(([week, items]) => (
        <div key={week} className="space-y-3">
          <h2 className="font-display text-xl">Week {week}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((a) => {
              const isDone = done.has(a.id);
              const isMarked = bookmarks.has(a.problem_url);
              return (
                <Card key={a.id} className={`p-4 ${isDone ? "border-primary bg-primary/5" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{a.title}</h3>
                        {a.difficulty && <Badge variant="secondary">{a.difficulty}</Badge>}
                      </div>
                      {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                      {a.due_date && <p className="text-xs text-muted-foreground mt-2">Due {new Date(a.due_date).toLocaleDateString()}</p>}
                    </div>
                    <button onClick={() => toggleBookmark(a)} className="text-muted-foreground hover:text-foreground" aria-label="bookmark">
                      {isMarked ? <BookmarkCheck className="size-4 text-coral" /> : <Bookmark className="size-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3 gap-2">
                    <a href={a.problem_url} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
                      Open problem <ExternalLink className="size-3" />
                    </a>
                    <Button size="sm" variant={isDone ? "default" : "outline"} onClick={() => toggleDone(a)}>
                      {isDone ? <><Check className="size-3.5 mr-1" /> Done</> : "Mark done"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
