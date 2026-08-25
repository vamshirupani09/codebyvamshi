import { seoHead, SITE_URL } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Github,
  Loader2,
  Star,
  GitFork,
  CircleDot,
  Search,
  Sparkles,
  RefreshCw,
  LinkIcon,
  Unlink,
  Copy,
  FileText,
  AlertTriangle,
  Printer,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { askAgentJson } from "@/lib/ai-client";
import { awardActivity } from "@/lib/gamification";
import { getGithubProfile, getGithubRepos, getRepoDetail, type GithubRepo } from "@/lib/github.functions";
import { buildPortfolioHtml, buildPortfolioMarkdown } from "@/lib/portfolio-export";

export const Route = createFileRoute("/github")({
  head: () =>
    seoHead({
      path: "/github",
      title: "GitHub Repo Review & Health Score | Codex",
      description:
        "Connect GitHub, import your repositories and get an AI review with a health score, issue list, rewritten README and a hiring-ready portfolio export.",
      ogTitle: "GitHub Repo Review & Health Score | Codex",
      ogDescription: "Import your GitHub repos and get an AI health score, README suggestions and a portfolio export.",
    }),
  component: GithubPage,
});

interface Connection {
  username: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  html_url: string | null;
}

interface RepoReview {
  health_score: number;
  verdict: string;
  summary: string;
  categories: Array<{ name: string; score: number; comment: string }>;
  strengths: string[];
  issues: Array<{ severity: "low" | "medium" | "high"; title: string; detail: string; fix: string }>;
  readme_feedback: string[];
  readme_suggestion: string;
  recruiter_pitch: string;
  next_steps: string[];
}

const SEVERITY: Record<string, string> = {
  high: "text-destructive",
  medium: "text-amber-600",
  low: "text-muted-foreground",
};

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 55) return "text-amber-600";
  return "text-destructive";
}

function ScoreRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div
      className="relative size-28 rounded-full grid place-items-center shrink-0"
      style={{
        background: `conic-gradient(hsl(var(--primary)) ${pct * 3.6}deg, hsl(var(--muted)) 0deg)`,
      }}
    >
      <div className="size-[86px] rounded-full bg-card grid place-items-center">
        <div className="text-center">
          <p className={`font-display text-2xl leading-none ${scoreTone(pct)}`}>{pct}</p>
          <p className="text-[10px] text-muted-foreground mt-1">health</p>
        </div>
      </div>
    </div>
  );
}

function GithubPage() {
  const { user } = useAuth();
  const fetchProfile = useServerFn(getGithubProfile);
  const fetchRepos = useServerFn(getGithubRepos);
  const fetchDetail = useServerFn(getRepoDetail);

  const [conn, setConn] = useState<Connection | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [query, setQuery] = useState("");
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [review, setReview] = useState<RepoReview | null>(null);
  const [reviewedRepo, setReviewedRepo] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Array<{ id: string; repo_full_name: string; health_score: number; created_at: string; report: RepoReview }>
  >([]);

  const loadRepos = useCallback(
    async (username: string) => {
      setLoadingRepos(true);
      try {
        const list = await fetchRepos({ data: { username } });
        setRepos(list);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load repositories");
      } finally {
        setLoadingRepos(false);
      }
    },
    [fetchRepos],
  );

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase.from("github_connections").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setConn(data as unknown as Connection);
        void loadRepos((data as unknown as Connection).username);
      }
      const { data: h } = await supabase
        .from("github_repo_reviews")
        .select("id, repo_full_name, health_score, created_at, report")
        .order("created_at", { ascending: false })
        .limit(10);
      if (h) setHistory(h as never);
    })();
  }, [user, loadRepos]);

  const connect = async () => {
    const username = usernameInput.trim().replace(/^@/, "").replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "");
    if (!username) return toast.error("Enter your GitHub username");
    if (!user) return;
    setConnecting(true);
    try {
      const profile = await fetchProfile({ data: { username } });
      const row = {
        user_id: user.id,
        username: profile.login,
        name: profile.name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        public_repos: profile.public_repos,
        followers: profile.followers,
        html_url: profile.html_url,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("github_connections").upsert(row, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
      setConn(row as unknown as Connection);
      toast.success(`Connected as @${profile.login}`);
      void loadRepos(profile.login);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not connect GitHub");
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!user) return;
    await supabase.from("github_connections").delete().eq("user_id", user.id);
    setConn(null);
    setRepos([]);
    setReview(null);
    setReviewedRepo(null);
    toast.success("GitHub disconnected");
  };

  const runReview = async (repo: GithubRepo) => {
    if (!user) return;
    setReviewing(repo.full_name);
    setReview(null);
    setReviewedRepo(repo.full_name);
    try {
      const [owner, name] = repo.full_name.split("/");
      const detail = await fetchDetail({ data: { owner: owner ?? "", repo: name ?? "" } });
      const context = JSON.stringify(
        {
          repo: {
            full_name: detail.repo.full_name,
            description: detail.repo.description,
            primary_language: detail.repo.language,
            stars: detail.repo.stargazers_count,
            forks: detail.repo.forks_count,
            open_issues: detail.repo.open_issues_count,
            topics: detail.repo.topics,
            license: detail.repo.license,
            archived: detail.repo.archived,
            is_fork: detail.repo.fork,
            size_kb: detail.repo.size,
            created_at: detail.repo.created_at,
            last_push: detail.repo.pushed_at,
          },
          languages: detail.languages,
          root_files: detail.files,
          recent_commits_sampled: detail.recentCommits,
          has_readme: detail.hasReadme,
          readme: detail.readme,
        },
        null,
        1,
      ).slice(0, 14000);

      const res = await askAgentJson<RepoReview>(
        "repo_review",
        `Review the GitHub repository ${repo.full_name} for a student building a placement portfolio.`,
        context,
      );
      setReview(res);
      void awardActivity("ai_query", { label: "repo_review", language: repo.language ?? undefined });

      const { data: saved } = await supabase
        .from("github_repo_reviews")
        .insert({
          user_id: user.id,
          repo_full_name: repo.full_name,
          repo_url: repo.html_url,
          health_score: Math.round(res.health_score ?? 0),
          report: res as never,
        })
        .select("id, repo_full_name, health_score, created_at, report")
        .maybeSingle();
      if (saved) setHistory((p) => [saved as never, ...p].slice(0, 10));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Review failed");
      setReviewedRepo(null);
    } finally {
      setReviewing(null);
    }
  };

  const exportPortfolio = (mode: "print" | "html" | "markdown") => {
    if (!review || !reviewedRepo || !conn) return;
    const doc = {
      repoFullName: reviewedRepo,
      repoUrl: `https://github.com/${reviewedRepo}`,
      review,
      author: {
        username: conn.username,
        name: conn.name,
        avatar_url: conn.avatar_url,
        html_url: conn.html_url,
      },
    };

    if (mode === "markdown") {
      void navigator.clipboard.writeText(buildPortfolioMarkdown(doc));
      toast.success("Portfolio summary copied as markdown");
      return;
    }

    const html = buildPortfolioHtml(doc);

    if (mode === "html") {
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reviewedRepo.replace("/", "-")}-portfolio.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Portfolio page downloaded");
      return;
    }

    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) {
      toast.error("Allow pop-ups to export the portfolio page");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.language ?? "").toLowerCase().includes(q),
    );
  }, [repos, query]);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6 max-w-6xl">
        <header className="space-y-1">
          <h1 className="font-display text-2xl md:text-3xl flex items-center gap-2">
            <Github className="size-6" /> GitHub Integration
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect your GitHub, import repositories, and get an AI review with a health score and README suggestions.
          </p>
        </header>

        {!conn ? (
          <Card className="p-6 space-y-4">
            <div className="space-y-1">
              <p className="font-display text-lg">Connect your GitHub account</p>
              <p className="text-sm text-muted-foreground">
                Enter your GitHub username to link your account. We read your public profile and public repositories —
                no password or token needed.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="e.g. torvalds"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && connect()}
              />
              <Button onClick={connect} disabled={connecting} className="shrink-0">
                {connecting ? <Loader2 className="size-4 animate-spin" /> : <LinkIcon className="size-4" />}
                Connect GitHub
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar className="size-14">
              {conn.avatar_url && <AvatarImage src={conn.avatar_url} alt={`${conn.username} GitHub avatar`} />}
              <AvatarFallback>{conn.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg truncate">{conn.name ?? conn.username}</p>
              <a
                href={conn.html_url ?? `https://github.com/${conn.username}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm text-primary hover:underline"
              >
                @{conn.username}
              </a>
              {conn.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{conn.bio}</p>}
              <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                <span>{conn.public_repos} repos</span>
                <span>{conn.followers} followers</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => loadRepos(conn.username)} disabled={loadingRepos}>
                {loadingRepos ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Re-import
              </Button>
              <Button variant="ghost" size="sm" onClick={disconnect}>
                <Unlink className="size-4" /> Disconnect
              </Button>
            </div>
          </Card>
        )}

        {conn && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-display text-xl">Imported repositories</h2>
              <div className="relative w-full sm:w-64">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search repositories"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            {loadingRepos ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin mx-auto mb-2" /> Importing repositories…
              </Card>
            ) : filtered.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">No repositories found.</Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((r) => (
                  <Card key={r.id} className="p-4 flex flex-col gap-3">
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <a
                          href={r.html_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="font-medium hover:underline truncate"
                        >
                          {r.name}
                        </a>
                        {r.fork && <Badge variant="secondary" className="shrink-0">fork</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[2.5rem]">
                        {r.description ?? "No description"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {r.language && <span className="flex items-center gap-1"><CircleDot className="size-3" />{r.language}</span>}
                      <span className="flex items-center gap-1"><Star className="size-3" />{r.stargazers_count}</span>
                      <span className="flex items-center gap-1"><GitFork className="size-3" />{r.forks_count}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-auto"
                      onClick={() => runReview(r)}
                      disabled={reviewing !== null}
                    >
                      {reviewing === r.full_name ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}
                      AI repository review
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {reviewing && (
          <Card className="p-6 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Analysing {reviewing} — reading README, languages and activity…
          </Card>
        )}

        {review && reviewedRepo && (
          <section className="space-y-4">
            <Card className="p-5 flex flex-col sm:flex-row gap-5 items-start">
              <ScoreRing score={Math.round(review.health_score ?? 0)} />
              <div className="space-y-2 min-w-0 flex-1">
                <p className="font-display text-xl">{reviewedRepo}</p>
                <Badge variant="secondary">{review.verdict}</Badge>
                <p className="text-sm text-muted-foreground">{review.summary}</p>
                {review.recruiter_pitch && (
                  <p className="text-sm border-l-2 border-primary pl-3 italic">{review.recruiter_pitch}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" onClick={() => exportPortfolio("print")}>
                    <Printer className="size-4" /> Save as PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportPortfolio("html")}>
                    <Download className="size-4" /> Download page
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportPortfolio("markdown")}>
                    <Copy className="size-4" /> Copy markdown
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  One-page hiring-ready summary with score, breakdown, highlights and next steps.
                </p>
              </div>
            </Card>

            <Tabs defaultValue="scores">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="scores">Breakdown</TabsTrigger>
                <TabsTrigger value="issues">Issues</TabsTrigger>
                <TabsTrigger value="readme">README suggestion</TabsTrigger>
                <TabsTrigger value="next">Next steps</TabsTrigger>
              </TabsList>

              <TabsContent value="scores" className="space-y-3 pt-4">
                {(review.categories ?? []).map((c) => (
                  <Card key={c.name} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{c.name}</p>
                      <span className={`text-sm font-display ${scoreTone(c.score)}`}>{c.score}</span>
                    </div>
                    <Progress value={c.score} />
                    <p className="text-sm text-muted-foreground">{c.comment}</p>
                  </Card>
                ))}
                {(review.strengths ?? []).length > 0 && (
                  <Card className="p-4">
                    <p className="text-sm font-medium mb-2">Strengths</p>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      {review.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="issues" className="space-y-3 pt-4">
                {(review.issues ?? []).length === 0 ? (
                  <Card className="p-6 text-sm text-muted-foreground">No blocking issues found.</Card>
                ) : (
                  review.issues.map((f, i) => (
                    <Card key={i} className="p-4 space-y-1">
                      <p className={`text-sm font-medium flex items-center gap-2 ${SEVERITY[f.severity] ?? ""}`}>
                        <AlertTriangle className="size-4" /> {f.title}
                        <Badge variant="outline" className="ml-auto capitalize">{f.severity}</Badge>
                      </p>
                      <p className="text-sm text-muted-foreground">{f.detail}</p>
                      <p className="text-sm"><span className="font-medium">Fix: </span>{f.fix}</p>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="readme" className="space-y-3 pt-4">
                {(review.readme_feedback ?? []).length > 0 && (
                  <Card className="p-4">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <FileText className="size-4" /> README feedback
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      {review.readme_feedback.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </Card>
                )}
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Suggested README</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void navigator.clipboard.writeText(review.readme_suggestion ?? "");
                        toast.success("README copied");
                      }}
                    >
                      <Copy className="size-4" /> Copy
                    </Button>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto">
                    <ReactMarkdown>{review.readme_suggestion ?? ""}</ReactMarkdown>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="next" className="pt-4">
                <Card className="p-4">
                  <ul className="text-sm list-decimal pl-5 space-y-1">
                    {(review.next_steps ?? []).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </Card>
              </TabsContent>
            </Tabs>
          </section>
        )}

        {history.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-xl">Past reviews</h2>
            <div className="grid gap-2">
              {history.map((h) => (
                <Card key={h.id} className="p-3 flex items-center gap-3">
                  <span className={`font-display text-lg w-10 text-center ${scoreTone(h.health_score)}`}>
                    {h.health_score}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{h.repo_full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReview(h.report);
                      setReviewedRepo(h.repo_full_name);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    View
                  </Button>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
