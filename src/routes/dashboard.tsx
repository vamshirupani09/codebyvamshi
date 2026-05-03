import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Code2, Bot, Map, CalendarDays, BookOpen, Trophy } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ROADMAP } from "@/lib/dsa-data";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  ),
});

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ done: 0, total: ROADMAP.length, assignmentsDone: 0, assignmentsTotal: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prog }, { data: ac }, { count: aTotal }] = await Promise.all([
        supabase.from("dsa_progress").select("topic,completed").eq("user_id", user.id).eq("completed", true),
        supabase.from("assignment_completions").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("assignments").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        done: prog?.length ?? 0,
        total: ROADMAP.length,
        assignmentsDone: ac?.length ?? 0,
        assignmentsTotal: aTotal ?? 0,
      });
    })();
  }, [user]);

  const pct = Math.round((stats.done / stats.total) * 100);

  const quick = [
    { to: "/compiler", icon: Code2, t: "Online Compiler", d: "Java, Python, C++, JS" },
    { to: "/assistant", icon: Bot, t: "AI Assistant", d: "Coder · Debugger · Tests · Explainer" },
    { to: "/roadmap", icon: Map, t: "DSA Roadmap", d: "Master arrays to graphs" },
    { to: "/assignments", icon: CalendarDays, t: "Weekly Tasks", d: "Stay on track" },
    { to: "/resources", icon: BookOpen, t: "Resources", d: "Books, sites & videos" },
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="font-display text-4xl mt-1">Hello, {user?.email?.split("@")[0]} 👋</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">DSA Progress</span>
            <Trophy className="size-4 text-coral" />
          </div>
          <p className="font-display text-3xl mt-2">{stats.done}/{stats.total}</p>
          <Progress value={pct} className="mt-3" />
        </Card>
        <Card className="p-5">
          <span className="text-sm text-muted-foreground">Assignments done</span>
          <p className="font-display text-3xl mt-2">{stats.assignmentsDone}/{stats.assignmentsTotal}</p>
        </Card>
        <Card className="p-5 bg-primary text-primary-foreground">
          <span className="text-sm opacity-80">Today's focus</span>
          <p className="font-display text-2xl mt-2">Stay consistent.</p>
          <p className="text-sm opacity-80 mt-1">One problem a day keeps the bugs away.</p>
        </Card>
      </div>

      <div>
        <h2 className="font-display text-2xl mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quick.map((q) => (
            <Link key={q.to} to={q.to}>
              <Card className="p-5 hover:shadow-md transition-shadow hover:-translate-y-0.5 transition-transform h-full">
                <q.icon className="size-5 text-primary" />
                <p className="font-display text-lg mt-3">{q.t}</p>
                <p className="text-sm text-muted-foreground mt-1">{q.d}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
