import { seoHead, SITE_URL } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Target, ShieldCheck, TrendingUp, Building2, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ROADMAP } from "@/lib/dsa-data";
import { COMPANIES } from "@/lib/companies";

export const Route = createFileRoute("/placement")({
  head: () => ({
    ...seoHead({
      path: "/placement",
      title: "Placement Readiness Score | Codex",
      description:
        "One score that combines your DSA progress, resume score, mock interview performance, coding activity and assignments into placement readiness.",
      ogTitle: "Placement Readiness Score | Codex",
      ogDescription: "Track how job-ready you are across DSA, resume, interviews and coding practice.",
      image: "/og/placement.jpg",
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Placement Readiness Dashboard",
          url: `${SITE_URL}/placement`,
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web",
          description:
            "A weighted readiness score combining DSA progress, resume score, mock interviews, coding activity and assignments, with target company recommendations.",
          featureList: [
            "Weighted placement readiness score",
            "DSA progress tracking",
            "Resume score integration",
            "Mock interview performance",
            "Target company recommendations",
          ],
          provider: { "@type": "Organization", name: "Codex", url: SITE_URL },
        }),
      },
    ],
  }),
  component: () => (
    <DashboardLayout>
      <Placement />
    </DashboardLayout>
  ),
});

interface Pillar {
  key: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
  to: string;
}

type LooseDb = { from: (t: string) => any };

function Placement() {
  const { user } = useAuth();
  const db = supabase as unknown as LooseDb;
  const [pillars, setPillars] = useState<Pillar[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const [progress, resume, interviews, completions, activity] = await Promise.all([
        db.from("dsa_progress").select("topic,completed").eq("user_id", user.id),
        db.from("resume_analyses").select("overall_score").order("created_at", { ascending: false }).limit(1),
        db.from("interview_sessions").select("overall_score").eq("status", "completed").order("created_at", { ascending: false }).limit(5),
        db.from("assignment_completions").select("id").eq("user_id", user.id),
        db.from("activity_log").select("id").eq("activity_type", "code_run"),
      ]);

      if (cancelled) return;

      const doneTopics = (progress.data ?? []).filter((d: { completed: boolean }) => d.completed).length;
      const dsaScore = Math.round((doneTopics / ROADMAP.length) * 100);

      const resumeScore = resume.data?.[0]?.overall_score ?? 0;

      const interviewScores = (interviews.data ?? [])
        .map((i: { overall_score: number | null }) => i.overall_score)
        .filter((s: number | null): s is number => typeof s === "number");
      const interviewScore = interviewScores.length
        ? Math.round(interviewScores.reduce((a: number, b: number) => a + b, 0) / interviewScores.length)
        : 0;

      const runs = (activity.data ?? []).length;
      const codingScore = Math.min(100, Math.round((runs / 100) * 100));

      const assignmentsDone = (completions.data ?? []).length;
      const assignmentScore = Math.min(100, Math.round((assignmentsDone / 20) * 100));

      setPillars([
        { key: "dsa", label: "DSA completion", score: dsaScore, weight: 0.3, detail: `${doneTopics} of ${ROADMAP.length} roadmap topics complete`, to: "/roadmap" },
        { key: "resume", label: "Resume score", score: resumeScore, weight: 0.2, detail: resumeScore ? "Latest ATS analysis" : "No resume analysed yet", to: "/resume-checker" },
        { key: "interview", label: "Mock interview score", score: interviewScore, weight: 0.2, detail: interviewScores.length ? `Average of last ${interviewScores.length} interviews` : "No completed interviews yet", to: "/interview" },
        { key: "coding", label: "Coding practice", score: codingScore, weight: 0.2, detail: `${runs} code runs (100 = full marks)`, to: "/compiler" },
        { key: "assignments", label: "Assignments", score: assignmentScore, weight: 0.1, detail: `${assignmentsDone} completed (20 = full marks)`, to: "/assignments" },
      ]);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!pillars) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Calculating readiness…
      </div>
    );
  }

  const readiness = Math.round(pillars.reduce((sum, p) => sum + p.score * p.weight, 0));
  const band =
    readiness >= 80 ? { label: "Interview ready", tone: "default" as const }
      : readiness >= 55 ? { label: "Almost there", tone: "secondary" as const }
      : { label: "Building foundations", tone: "outline" as const };

  const weakest = [...pillars].sort((a, b) => a.score - b.score).slice(0, 3);
  const targets = readiness >= 75
    ? COMPANIES.filter((c) => c.tier === "Product").slice(0, 6)
    : COMPANIES.filter((c) => c.tier === "Service").slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Placement Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your job-readiness across every part of the platform, in one score.</p>
      </div>

      <Card className="p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 100 100" className="size-32 -rotate-90">
            <circle cx="50" cy="50" r="42" className="fill-none stroke-muted" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="42"
              className="fill-none stroke-primary transition-all duration-700"
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${(readiness / 100) * 264} 264`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl">{readiness}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="flex-1 space-y-2 text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <Target className="size-5 text-primary" />
            <h2 className="font-display text-xl">Placement Readiness Score</h2>
            <Badge variant={band.tone}>{band.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Weighted from DSA (30%), resume (20%), mock interviews (20%), coding practice (20%) and assignments (10%).
          </p>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pillars.map((p) => (
          <Card key={p.key} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{p.label}</p>
              <span className="text-sm font-semibold">{p.score}</span>
            </div>
            <Progress value={p.score} />
            <p className="text-xs text-muted-foreground">{p.detail}</p>
            <Button asChild size="sm" variant="ghost" className="px-0">
              <Link to={p.to}>Improve →</Link>
            </Button>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 space-y-3">
          <p className="text-sm font-medium flex items-center gap-2"><TrendingUp className="size-4" /> Suggested improvements</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {weakest.map((w) => (
              <li key={w.key} className="flex gap-2">
                <ShieldCheck className="size-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">{w.label}</strong> is at {w.score}/100 — {w.detail.toLowerCase()}.{" "}
                  <Link to={w.to} className="underline">Work on it</Link>.
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 space-y-3">
          <p className="text-sm font-medium flex items-center gap-2"><Building2 className="size-4" /> Target companies for your level</p>
          <div className="flex flex-wrap gap-2">
            {targets.map((c) => (
              <Badge key={c.slug} variant="secondary" className="text-sm">{c.name}</Badge>
            ))}
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/companies">Open Company Prep Hub</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
