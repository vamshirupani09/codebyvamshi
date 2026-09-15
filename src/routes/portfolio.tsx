import { seoHead, SITE_URL } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  Loader2,
  Printer,
  Download,
  Copy,
  RefreshCw,
  CheckCircle2,
  Circle,
  Github,
  FileScan,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { askAgentJson } from "@/lib/ai-client";
import { awardActivity } from "@/lib/gamification";
import { getGithubRepos } from "@/lib/github.functions";
import {
  TEMPLATES,
  buildPortfolioDocument,
  downloadHtmlDocument,
  printHtmlDocument,
  type PortfolioContent,
  type PortfolioRepo,
  type TemplateId,
} from "@/lib/portfolio-templates";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    ...seoHead({
      path: "/portfolio",
      title: "AI Portfolio Generator & PDF Export | Codex",
      description:
        "Turn your resume, GitHub profile and repository reviews into a polished portfolio site or a one-page hiring document, exportable as PDF and HTML.",
      ogTitle: "AI Portfolio Generator & PDF Export | Codex",
      ogDescription: "Generate a portfolio website and a hiring one-pager from your resume and GitHub repos.",
      image: "/og/github.jpg",
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "AI Portfolio Generator",
          url: `${SITE_URL}/portfolio`,
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Web",
          description:
            "Generate a developer portfolio website and a one-page hiring document from resume analysis, GitHub profile and repository reviews, with PDF and HTML export.",
          featureList: [
            "Resume-aware portfolio copy",
            "Live GitHub repository section",
            "Multiple portfolio templates",
            "One-page hiring document",
            "PDF and HTML export",
          ],
          provider: { "@type": "Organization", name: "Codex", url: SITE_URL },
        }),
      },
    ],
  }),
  component: () => (
    <DashboardLayout>
      <PortfolioPage />
    </DashboardLayout>
  ),
});

interface Connection {
  username: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  html_url: string | null;
}

interface RepoReviewRow {
  repo_full_name: string;
  health_score: number;
  report: { summary?: string; recruiter_pitch?: string; verdict?: string } | null;
}

const STEPS = ["Reading your resume analysis", "Loading GitHub repositories", "Writing portfolio copy", "Rendering templates"];

function storageKey(uid: string) {
  return `codex.portfolio.${uid}`;
}

function PortfolioPage() {
  const { user } = useAuth();
  const fetchRepos = getGithubRepos;

  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [repos, setRepos] = useState<PortfolioRepo[]>([]);
  const [resume, setResume] = useState<{ score: number; report: Record<string, unknown>; text: string | null } | null>(null);
  const [reviews, setReviews] = useState<RepoReviewRow[]>([]);

  const [content, setContent] = useState<PortfolioContent | null>(null);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(-1);
  const [template, setTemplate] = useState<TemplateId>("aurora");

  /* ---------------------------- load sources ---------------------------- */
  useEffect(() => {
    if (!user) return;
    let alive = true;

    (async () => {
      const cached = localStorage.getItem(storageKey(user.id));
      if (cached) {
        try {
          setContent(JSON.parse(cached) as PortfolioContent);
        } catch {
          /* ignore malformed cache */
        }
      }

      const [{ data: conn }, { data: res }, { data: revs }] = await Promise.all([
        supabase.from("github_connections").select("username,name,avatar_url,bio,html_url").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("resume_analyses")
          .select("overall_score,report,resume_text")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("github_repo_reviews")
          .select("repo_full_name,health_score,report")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      if (!alive) return;
      setConnection((conn as Connection) ?? null);
      if (res) setResume({ score: Number(res.overall_score ?? 0), report: (res.report ?? {}) as Record<string, unknown>, text: res.resume_text ?? null });
      setReviews((revs ?? []) as unknown as RepoReviewRow[]);
      setLoading(false);

      if (conn?.username) {
        try {
          const list = await fetchRepos({ data: { username: conn.username } });
          if (!alive) return;
          setRepos(
            list
              .filter((r) => !r.fork && !r.archived)
              .sort((a, b) => b.stargazers_count - a.stargazers_count || Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
              .slice(0, 8)
              .map((r) => ({
                name: r.name,
                full_name: r.full_name,
                description: r.description,
                html_url: r.html_url,
                language: r.language,
                stargazers_count: r.stargazers_count,
                forks_count: r.forks_count,
                topics: r.topics,
              })),
          );
        } catch {
          /* repos are optional */
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [user, fetchRepos]);

  const meta = useMemo(
    () => ({
      username: connection?.username ?? "your-github",
      avatar_url: connection?.avatar_url ?? null,
      github_url: connection?.html_url ?? `https://github.com/${connection?.username ?? ""}`,
      email: user?.email ?? null,
      resumeScore: resume?.score ?? null,
    }),
    [connection, user, resume],
  );

  const html = useMemo(
    () => (content ? buildPortfolioDocument(template, content, repos, meta) : ""),
    [content, template, repos, meta],
  );

  /* ------------------------------ generate ------------------------------ */
  const generate = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    setStep(0);

    try {
      const r = resume?.report as
        | { summary?: string; strengths?: string[]; missing_keywords?: string[]; breakdown?: Record<string, number> }
        | undefined;

      setStep(1);
      const context = JSON.stringify({
        name: connection?.name ?? user.email?.split("@")[0],
        github: { username: connection?.username, bio: connection?.bio },
        resume: {
          score: resume?.score ?? null,
          summary: r?.summary ?? null,
          strengths: (r?.strengths ?? []).slice(0, 6),
          keywords: (r?.missing_keywords ?? []).slice(0, 10),
          text: (resume?.text ?? "").slice(0, 4000),
        },
        repos: repos.map((x) => ({
          name: x.name,
          description: x.description,
          language: x.language,
          topics: x.topics.slice(0, 5),
          stars: x.stargazers_count,
          url: x.html_url,
        })),
        repo_reviews: reviews.map((x) => ({
          repo: x.repo_full_name,
          score: x.health_score,
          summary: x.report?.summary?.slice(0, 300) ?? null,
        })),
      });

      setStep(2);
      const result = await askAgentJson<PortfolioContent>(
        "portfolio",
        "Generate portfolio website copy and a hiring summary for this candidate using only the supplied data.",
        context,
      );

      setStep(3);
      setContent(result);
      localStorage.setItem(storageKey(user.id), JSON.stringify(result));
      void awardActivity("ai_query");
      toast.success("Portfolio generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate the portfolio. Please retry.");
    } finally {
      setGenerating(false);
      setStep(-1);
    }
  }, [user, connection, resume, repos, reviews]);

  const fileBase = `${(content?.name ?? meta.username).replace(/\s+/g, "-").toLowerCase()}-${template}`;
  const hasSource = Boolean(connection || resume);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Portfolio Generator</h1>
          <p className="text-sm text-muted-foreground">
            Build a portfolio site and a hiring one-pager from your resume, GitHub profile and repo reviews.
          </p>
        </div>
        <Button onClick={generate} disabled={generating || !hasSource} className="min-h-11">
          {generating ? <Loader2 className="size-4 animate-spin" /> : content ? <RefreshCw className="size-4" /> : <Sparkles className="size-4" />}
          {generating ? "Generating…" : content ? "Regenerate" : "Generate portfolio"}
        </Button>
      </div>

      {/* sources */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileScan className="size-4 text-primary" /> Resume
            </div>
            {resume ? (
              <p className="text-sm text-muted-foreground">ATS score {Math.round(resume.score)}/100 loaded.</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                None yet — <Link to="/resume-checker" className="text-primary hover:underline">analyse a resume</Link>.
              </p>
            )}
          </Card>
          <Card className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Github className="size-4 text-primary" /> GitHub
            </div>
            {connection ? (
              <p className="text-sm text-muted-foreground">
                @{connection.username} · {repos.length} live repos
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not linked — <Link to="/github" className="text-primary hover:underline">connect GitHub</Link>.
              </p>
            )}
          </Card>
          <Card className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-primary" /> Repo reviews
            </div>
            <p className="text-sm text-muted-foreground">
              {reviews.length ? `${reviews.length} saved review${reviews.length > 1 ? "s" : ""} included.` : "No reviews saved yet."}
            </p>
          </Card>
        </div>
      )}

      {!loading && !hasSource && (
        <Card className="p-5 flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-600 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Add at least one source first: analyse a resume on the Resume Checker page or connect your GitHub account.
          </p>
        </Card>
      )}

      {/* progress */}
      {generating && (
        <Card className="p-5 space-y-3" aria-live="polite">
          <p className="text-sm font-medium">Building your portfolio…</p>
          <ul className="space-y-2">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2 text-sm">
                {i < step ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : i === step ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <Circle className="size-4 text-muted-foreground/40" />
                )}
                <span className={i <= step ? "" : "text-muted-foreground"}>{s}</span>
              </li>
            ))}
          </ul>
          <Skeleton className="h-64 w-full rounded-xl" />
        </Card>
      )}

      {/* templates + preview */}
      {content && !generating && (
        <div className="space-y-4">
          <Tabs value={template} onValueChange={(v) => setTemplate(v as TemplateId)}>
            <TabsList className="w-full justify-start overflow-x-auto">
              {TEMPLATES.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className="min-h-11 whitespace-nowrap">
                  {t.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{TEMPLATES.find((t) => t.id === template)?.blurb}</Badge>
            <div className="flex-1" />
            <Button variant="outline" className="min-h-11" onClick={() => printHtmlDocument(html) || toast.error("Allow pop-ups to export the PDF.")}>
              <Printer className="size-4" /> Save as PDF
            </Button>
            <Button variant="outline" className="min-h-11" onClick={() => downloadHtmlDocument(html, `${fileBase}.html`)}>
              <Download className="size-4" /> Download HTML
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={async () => {
                await navigator.clipboard.writeText(html);
                toast.success("HTML copied");
              }}
            >
              <Copy className="size-4" /> Copy HTML
            </Button>
          </div>

          <Card className="overflow-hidden p-0">
            <iframe
              title={`${TEMPLATES.find((t) => t.id === template)?.name} portfolio preview`}
              srcDoc={html}
              className="w-full h-[70vh] min-h-[28rem] bg-white"
              sandbox="allow-popups allow-popups-to-escape-sandbox"
            />
          </Card>
        </div>
      )}
    </div>
  );
}
