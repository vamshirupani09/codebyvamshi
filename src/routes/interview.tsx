import { seoHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Briefcase, Loader2, Send, Sparkles, Trophy, History, MessageSquare, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { askAgentJson } from "@/lib/ai-client";
import { awardActivity } from "@/lib/gamification";

export const Route = createFileRoute("/interview")({
  head: () =>
    seoHead({
      path: "/interview",
      title: "AI Mock Interview Practice | Codex",
      description:
        "Practise HR, technical, coding, system design and behavioural interviews with an AI interviewer that scores every answer and generates a report.",
      ogTitle: "AI Mock Interview Practice | Codex",
      ogDescription: "Realistic AI mock interviews with per-answer scoring and a final report.",
    }),
  component: () => (
    <DashboardLayout>
      <Interview />
    </DashboardLayout>
  ),
});

const TYPES = [
  { id: "hr", label: "HR" },
  { id: "technical", label: "Technical" },
  { id: "coding", label: "Coding" },
  { id: "system_design", label: "System Design" },
  { id: "behavioural", label: "Behavioural" },
] as const;

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const TOTAL_QUESTIONS = 6;

interface Turn {
  question: string;
  topic: string;
  answer?: string;
  feedback?: string | null;
  score?: number | null;
}

interface Report {
  overall_score: number;
  verdict: string;
  categories: { name: string; score: number; comment: string }[];
  strengths: string[];
  improvements: string[];
  action_plan: string[];
  summary: string;
}

interface SessionRow {
  id: string;
  interview_type: string;
  role_target: string | null;
  company: string | null;
  difficulty: string;
  status: string;
  overall_score: number | null;
  created_at: string;
  report: Report | null;
  transcript: Turn[];
}

type LooseDb = {
  from: (t: string) => any;
};

function Interview() {
  const { user } = useAuth();
  const db = supabase as unknown as LooseDb;

  const [type, setType] = useState<string>("technical");
  const [role, setRole] = useState("Software Engineer");
  const [company, setCompany] = useState("");
  const [difficulty, setDifficulty] = useState<string>("medium");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [history, setHistory] = useState<SessionRow[]>([]);
  const bottom = useRef<HTMLDivElement>(null);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await db
      .from("interview_sessions")
      .select("id,interview_type,role_target,company,difficulty,status,overall_score,created_at,report,transcript")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setHistory(data as SessionRow[]);
  };

  useEffect(() => { void loadHistory(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [turns.length, busy]);

  const config = () =>
    `Interview type: ${type}\nTarget role: ${role || "Software Engineer"}\nCompany: ${company || "a strong product company"}\nDifficulty: ${difficulty}\nPlanned questions: ${TOTAL_QUESTIONS}`;

  const transcriptText = (t: Turn[]) =>
    t.length === 0
      ? "No questions asked yet. This is the first question."
      : t
          .map((x, i) => `Q${i + 1} (${x.topic}): ${x.question}\nAnswer: ${x.answer ?? "(unanswered)"}`)
          .join("\n\n");

  const nextQuestion = async (current: Turn[], sid: string) => {
    const res = await askAgentJson<{ question: string; topic: string; feedback_on_previous: string | null; score_for_previous: number | null }>(
      "interviewer",
      `${config()}\n\nTranscript so far:\n${transcriptText(current)}`,
    );
    const updated = [...current];
    if (updated.length > 0 && res.feedback_on_previous) {
      const last = updated[updated.length - 1]!;
      updated[updated.length - 1] = { ...last, feedback: res.feedback_on_previous, score: res.score_for_previous ?? null };
    }
    updated.push({ question: res.question, topic: res.topic });
    setTurns(updated);
    await db.from("interview_sessions").update({ transcript: updated, updated_at: new Date().toISOString() }).eq("id", sid);
    return updated;
  };

  const start = async () => {
    if (!user) return toast.error("Please sign in first");
    setBusy(true);
    setReport(null);
    setTurns([]);
    try {
      const { data, error } = await db
        .from("interview_sessions")
        .insert({
          user_id: user.id,
          interview_type: type,
          role_target: role || null,
          company: company || null,
          difficulty,
          status: "in_progress",
          transcript: [],
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      const sid = data.id as string;
      setSessionId(sid);
      await nextQuestion([], sid);
      toast.success("Interview started — good luck!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start interview");
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async () => {
    if (!sessionId || !answer.trim()) return toast.error("Write your answer first");
    setBusy(true);
    const answered = [...turns];
    answered[answered.length - 1] = { ...answered[answered.length - 1]!, answer: answer.trim() };
    setTurns(answered);
    setAnswer("");
    try {
      if (answered.length >= TOTAL_QUESTIONS) {
        await finish(answered, sessionId);
      } else {
        await nextQuestion(answered, sessionId);
        void awardActivity("ai_query", { label: `interview_${type}` });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setBusy(false);
    }
  };

  const finish = async (finalTurns: Turn[], sid: string) => {
    const rep = await askAgentJson<Report>(
      "interview_report",
      `${config()}\n\nFull transcript:\n${transcriptText(finalTurns)}`,
    );
    setReport(rep);
    await db
      .from("interview_sessions")
      .update({
        transcript: finalTurns,
        report: rep,
        overall_score: Math.round(rep.overall_score),
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sid);
    void awardActivity("ai_query", { label: `interview_report_${type}` });
    void loadHistory();
    toast.success("Interview complete — report ready");
  };

  const endEarly = async () => {
    if (!sessionId) return;
    setBusy(true);
    try {
      await finish(turns, sessionId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build report");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setSessionId(null);
    setTurns([]);
    setReport(null);
    setAnswer("");
  };

  const answered = turns.filter((t) => t.answer).length;
  const progress = Math.round((answered / TOTAL_QUESTIONS) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">AI Mock Interview</h1>
        <p className="text-sm text-muted-foreground">
          HR, technical, coding, system design and behavioural rounds — scored question by question.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 space-y-3 lg:col-span-1">
          <p className="text-sm font-medium flex items-center gap-2"><Briefcase className="size-4" /> Setup</p>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Interview type</label>
            <Select value={type} onValueChange={setType} disabled={!!sessionId && !report}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Target role</label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} maxLength={80} placeholder="Software Engineer" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Company (optional)</label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={60} placeholder="Google" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Difficulty</label>
            <Select value={difficulty} onValueChange={setDifficulty} disabled={!!sessionId && !report}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!sessionId || report ? (
            <Button className="w-full" onClick={() => { reset(); void start(); }} disabled={busy}>
              {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
              Start interview
            </Button>
          ) : (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">{answered} / {TOTAL_QUESTIONS} answered</p>
              <Button variant="outline" className="w-full" onClick={endEarly} disabled={busy || answered === 0}>
                End & get report
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-4 lg:col-span-2 flex flex-col min-h-[26rem]">
          <p className="text-sm font-medium mb-2 flex items-center gap-2"><MessageSquare className="size-4" /> Interview room</p>
          <ScrollArea className="flex-1 pr-3 max-h-[26rem]">
            {turns.length === 0 && !busy && (
              <p className="text-sm text-muted-foreground">Configure the round on the left, then start. The AI asks one question at a time.</p>
            )}
            <div className="space-y-4">
              {turns.map((t, i) => (
                <div key={i} className="space-y-2">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">Q{i + 1}</Badge>
                      <span className="text-xs text-muted-foreground">{t.topic}</span>
                    </div>
                    <p className="text-sm">{t.question}</p>
                  </div>
                  {t.answer && (
                    <div className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">{t.answer}</div>
                  )}
                  {t.feedback && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">Interviewer feedback</span>
                        {typeof t.score === "number" && <Badge>{t.score}/10</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{t.feedback}</p>
                    </div>
                  )}
                </div>
              ))}
              {busy && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Thinking…</p>}
              <div ref={bottom} />
            </div>
          </ScrollArea>

          {sessionId && !report && (
            <div className="mt-3 space-y-2">
              <Textarea
                rows={4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                maxLength={4000}
                placeholder="Type your answer — speak like you would in a real interview…"
              />
              <Button className="w-full" onClick={submitAnswer} disabled={busy || turns.length === 0}>
                {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
                Submit answer
              </Button>
            </div>
          )}
        </Card>
      </div>

      {report && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Trophy className="size-5 text-primary" />
            <h2 className="font-display text-2xl">Interview report</h2>
            <Badge className="text-base px-3 py-1">{report.overall_score}/100</Badge>
            <Badge variant="secondary">{report.verdict}</Badge>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={reset}>
              <RotateCcw className="size-4 mr-2" /> New interview
            </Button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{report.summary}</ReactMarkdown>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {report.categories?.map((c) => (
              <div key={c.name} className="rounded-lg border p-3 space-y-1">
                <div className="flex justify-between text-sm"><span>{c.name}</span><span className="font-medium">{c.score}</span></div>
                <Progress value={c.score} />
                <p className="text-xs text-muted-foreground">{c.comment}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <ListBlock title="Strengths" items={report.strengths} />
            <ListBlock title="Improvements" items={report.improvements} />
            <ListBlock title="Action plan" items={report.action_plan} />
          </div>
        </Card>
      )}

      <Card className="p-5">
        <p className="text-sm font-medium mb-3 flex items-center gap-2"><History className="size-4" /> Past interviews</p>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No interviews yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setSessionId(null);
                  setTurns(h.transcript ?? []);
                  setReport(h.report ?? null);
                }}
                className="w-full text-left flex flex-wrap items-center gap-2 rounded-lg border p-3 hover:bg-muted/50 transition"
              >
                <Badge variant="secondary">{h.interview_type}</Badge>
                <span className="text-sm">{h.role_target ?? "Role"}{h.company ? ` · ${h.company}` : ""}</span>
                <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</span>
                <span className="ml-auto text-sm font-medium">
                  {h.overall_score != null ? `${h.overall_score}/100` : h.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items?: string[] }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-sm font-medium mb-2">{title}</p>
      <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
        {(items ?? []).map((i, k) => <li key={k}>{i}</li>)}
      </ul>
    </div>
  );
}
