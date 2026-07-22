import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Loader2,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Target,
  Zap,
  X,
  History,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/resume-checker")({
  component: () => (
    <DashboardLayout>
      <ResumeChecker />
    </DashboardLayout>
  ),
});

type Report = {
  overall_score: number;
  summary: string;
  breakdown: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  missing_keywords: string[];
  action_verbs_suggestions: string[];
  improved_bullets: { original: string; improved: string }[];
  section_feedback: Record<string, string>;
  ats_issues: string[];
  grammar_issues: string[];
  recommended_certifications: string[];
  missing_links: string[];
  top_priority_actions: string[];
};

type HistoryRow = {
  id: string;
  file_name: string;
  overall_score: number;
  created_at: string;
  report: Report;
};

const BREAKDOWN_LABELS: Record<string, string> = {
  ats_compatibility: "ATS Compatibility",
  technical_skills: "Technical Skills",
  projects: "Projects",
  experience: "Experience",
  education: "Education",
  achievements: "Achievements",
  keywords: "Keywords",
  formatting: "Formatting",
  grammar: "Grammar",
  readability: "Readability",
  impact: "Impact",
};

async function extractPdf(file: File): Promise<string> {
  // dynamic import — pdfjs uses window
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    const content = await p.getTextContent();
    text +=
      content.items
        .map((it: unknown) => ((it as { str?: string }).str ?? ""))
        .join(" ") + "\n\n";
  }
  return text;
}

async function extractDocx(file: File): Promise<string> {
  // @ts-expect-error - no types for browser build
  const mammoth = await import("mammoth/mammoth.browser");
  const buf = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return res.value;
}

async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return extractPdf(file);
  if (name.endsWith(".docx")) return extractDocx(file);
  if (name.endsWith(".txt") || name.endsWith(".md")) return file.text();
  throw new Error("Unsupported file. Upload PDF, DOCX, or TXT.");
}

function scoreColor(s: number) {
  if (s >= 80) return "text-emerald-600";
  if (s >= 60) return "text-amber-600";
  return "text-red-600";
}
function scoreBadge(s: number) {
  if (s >= 80) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (s >= 60) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  return "bg-red-500/10 text-red-600 border-red-500/20";
}

function ResumeChecker() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("resume_analyses")
      .select("id, file_name, overall_score, created_at, report")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setHistory(data as unknown as HistoryRow[]);
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Max file size is 8 MB");
      return;
    }
    setFile(f);
  };

  const analyze = async () => {
    if (!file) return toast.error("Upload a resume first");
    setBusy(true);
    setReport(null);
    try {
      setPhase("Parsing document…");
      const text = await extractText(file);
      if (text.trim().length < 100) throw new Error("Couldn't read enough text — try a text-based PDF.");

      setPhase("Analyzing with AI…");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) throw new Error("Please sign in.");
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resume-analyzer`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session.access_token}`,
        },
        body: JSON.stringify({
          resume_text: text,
          target_role: targetRole,
          file_name: file.name,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Analysis failed");
      setReport(j.report as Report);
      toast.success(`Scored ${j.overall_score}/100`);
      loadHistory();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setBusy(false);
      setPhase("");
    }
  };

  const removeHistory = async (id: string) => {
    await supabase.from("resume_analyses").delete().eq("id", id);
    setHistory((p) => p.filter((r) => r.id !== id));
    toast.success("Deleted");
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">AI Resume Score Checker</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your resume (PDF, DOCX, TXT) — get an ATS score, keyword analysis, and actionable rewrites.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload */}
        <Card className="lg:col-span-1 p-5 space-y-4 h-fit">
          <div className="space-y-2">
            <Label htmlFor="role">Target role</Label>
            <Input
              id="role"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g., Backend Engineer, ML Intern"
            />
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              onFile(e.dataTransfer.files?.[0] ?? null);
            }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <Upload className="size-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">
              {file ? file.name : "Drop your resume or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF · DOCX · TXT · max 8 MB</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {file && (
            <div className="flex items-center justify-between text-xs bg-muted rounded-md px-3 py-2">
              <span className="flex items-center gap-2 truncate">
                <FileText className="size-3.5 shrink-0" /> {file.name}
              </span>
              <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <Button className="w-full" onClick={analyze} disabled={!file || busy}>
            {busy ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> {phase || "Analyzing…"}
              </>
            ) : (
              <>
                <Sparkles className="size-4 mr-2" /> Analyze resume
              </>
            )}
          </Button>

          <div className="pt-2 border-t space-y-2">
            <p className="text-xs font-medium flex items-center gap-1.5">
              <History className="size-3.5" /> Recent analyses
            </p>
            <ScrollArea className="max-h-56">
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No previous analyses.</p>
              ) : (
                <ul className="space-y-1.5">
                  {history.map((h) => (
                    <li
                      key={h.id}
                      className="group flex items-center justify-between gap-2 text-xs rounded-md px-2 py-1.5 hover:bg-accent"
                    >
                      <button
                        onClick={() => setReport(h.report)}
                        className="text-left truncate flex-1"
                      >
                        <span className="font-medium">{h.file_name}</span>
                        <span className="text-muted-foreground ml-2">
                          {new Date(h.created_at).toLocaleDateString()}
                        </span>
                      </button>
                      <span className={`font-mono font-semibold ${scoreColor(h.overall_score)}`}>
                        {h.overall_score}
                      </span>
                      <button
                        onClick={() => removeHistory(h.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>
        </Card>

        {/* Report */}
        <div className="lg:col-span-2 space-y-5">
          {!report && !busy && (
            <Card className="p-10 text-center text-muted-foreground">
              <Target className="size-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Your report will appear here.</p>
            </Card>
          )}
          {busy && !report && (
            <Card className="p-10 text-center">
              <Loader2 className="size-8 mx-auto animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">{phase}</p>
            </Card>
          )}

          {report && (
            <>
              {/* Score card */}
              <Card className="p-6">
                <div className="flex items-start gap-6 flex-wrap">
                  <div className="text-center">
                    <div
                      className={`size-32 rounded-full border-8 flex flex-col items-center justify-center ${scoreBadge(
                        report.overall_score,
                      )}`}
                    >
                      <span className={`text-4xl font-display ${scoreColor(report.overall_score)}`}>
                        {report.overall_score}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        / 100
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[240px]">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Overall Resume Score
                    </p>
                    <p className="text-sm mt-2 leading-relaxed">{report.summary}</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={downloadReport}>
                      Download JSON report
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Breakdown */}
              <Card className="p-6">
                <h2 className="font-display text-lg mb-4 flex items-center gap-2">
                  <TrendingUp className="size-4" /> Category Breakdown
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {Object.entries(report.breakdown || {}).map(([k, v]) => (
                    <div key={k}>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{BREAKDOWN_LABELS[k] ?? k}</span>
                        <span className={`font-mono font-semibold ${scoreColor(v)}`}>{v}</span>
                      </div>
                      <Progress value={v} className="h-2" />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Tabbed insights */}
              <Card className="p-2">
                <Tabs defaultValue="actions">
                  <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4">
                    <TabsTrigger value="actions">Priorities</TabsTrigger>
                    <TabsTrigger value="strengths">S / W</TabsTrigger>
                    <TabsTrigger value="keywords">Keywords</TabsTrigger>
                    <TabsTrigger value="rewrites">Rewrites</TabsTrigger>
                  </TabsList>

                  <TabsContent value="actions" className="p-4 space-y-4">
                    <Section title="Top priority actions" icon={<Zap className="size-4" />}>
                      <ol className="space-y-2 text-sm list-decimal list-inside">
                        {(report.top_priority_actions || []).map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ol>
                    </Section>
                    <Section title="ATS issues" icon={<AlertCircle className="size-4 text-amber-600" />}>
                      <BulletList items={report.ats_issues} empty="No ATS issues detected." />
                    </Section>
                    <Section title="Missing links" icon={<AlertCircle className="size-4" />}>
                      <BulletList items={report.missing_links} empty="All key links present." />
                    </Section>
                  </TabsContent>

                  <TabsContent value="strengths" className="p-4 grid md:grid-cols-2 gap-4">
                    <Section
                      title="Strengths"
                      icon={<CheckCircle2 className="size-4 text-emerald-600" />}
                    >
                      <BulletList items={report.strengths} />
                    </Section>
                    <Section title="Weaknesses" icon={<AlertCircle className="size-4 text-red-600" />}>
                      <BulletList items={report.weaknesses} />
                    </Section>
                    <Section title="Grammar issues" icon={<AlertCircle className="size-4" />}>
                      <BulletList items={report.grammar_issues} empty="Grammar looks clean." />
                    </Section>
                    <Section title="Recommended certifications" icon={<Target className="size-4" />}>
                      <BulletList items={report.recommended_certifications} />
                    </Section>
                  </TabsContent>

                  <TabsContent value="keywords" className="p-4 space-y-4">
                    <Section title="Missing keywords for your target role" icon={<Target className="size-4" />}>
                      <div className="flex flex-wrap gap-1.5">
                        {(report.missing_keywords || []).map((k, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </Section>
                    <Section title="Stronger action verbs" icon={<Zap className="size-4" />}>
                      <div className="flex flex-wrap gap-1.5">
                        {(report.action_verbs_suggestions || []).map((k, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 rounded-md bg-muted border"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </Section>
                    <Section title="Section feedback" icon={<FileText className="size-4" />}>
                      <div className="space-y-3">
                        {Object.entries(report.section_feedback || {}).map(([k, v]) => (
                          <div key={k}>
                            <p className="text-xs font-medium capitalize">{k.replace(/_/g, " ")}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{v}</p>
                          </div>
                        ))}
                      </div>
                    </Section>
                  </TabsContent>

                  <TabsContent value="rewrites" className="p-4 space-y-4">
                    <Section title="Bullet rewrites (before → after)" icon={<Sparkles className="size-4" />}>
                      <div className="space-y-3">
                        {(report.improved_bullets || []).map((b, i) => (
                          <div key={i} className="rounded-lg border p-3 text-xs space-y-1.5">
                            <div>
                              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">
                                Original
                              </span>
                              <p className="text-red-600/90">{b.original}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">
                                Improved
                              </span>
                              <p className="text-emerald-600">{b.improved}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  </TabsContent>
                </Tabs>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-medium flex items-center gap-1.5 mb-2">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

function BulletList({ items, empty = "None." }: { items?: string[]; empty?: string }) {
  if (!items || items.length === 0)
    return <p className="text-xs text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-1 text-sm">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-muted-foreground shrink-0">•</span>
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}
