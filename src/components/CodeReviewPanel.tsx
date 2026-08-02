import { useState } from "react";
import { ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { askAgentJson } from "@/lib/ai-client";
import { awardActivity } from "@/lib/gamification";

interface Finding {
  category: string;
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
  suggestion: string;
}

interface Review {
  summary: string;
  scores: Record<string, number>;
  overall: number;
  findings: Finding[];
  complexity: { time: string; space: string };
  improved_code: string;
}

const SEVERITY: Record<string, string> = {
  high: "text-destructive",
  medium: "text-amber-600",
  low: "text-muted-foreground",
};

export function CodeReviewPanel({ code, language }: { code: string; language: string }) {
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!code.trim()) return toast.error("Write some code first");
    setBusy(true);
    setReview(null);
    try {
      const res = await askAgentJson<Review>(
        "code_review",
        `Review this ${language} submission.`,
        code.slice(0, 12000),
      );
      setReview(res);
      void awardActivity("ai_query", { label: "code_review", language });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-medium flex items-center gap-2"><ShieldCheck className="size-4" /> AI Code Review</p>
        <Button size="sm" variant="outline" onClick={run} disabled={busy}>
          {busy ? <Loader2 className="size-3.5 mr-2 animate-spin" /> : null}
          Review code
        </Button>
      </div>

      {!review && !busy && (
        <p className="text-xs text-muted-foreground">
          Bugs, readability, naming, optimisation, security, best practices, complexity and maintainability — scored.
        </p>
      )}

      {review && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="text-sm">{review.overall}/100</Badge>
            <span className="text-xs text-muted-foreground">
              Time {review.complexity?.time} · Space {review.complexity?.space}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{review.summary}</p>

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(review.scores ?? {}).map(([k, v]) => (
              <div key={k} className="space-y-1">
                <div className="flex justify-between text-[11px] capitalize">
                  <span>{k.replace(/_/g, " ")}</span><span>{v}</span>
                </div>
                <Progress value={v} className="h-1.5" />
              </div>
            ))}
          </div>

          {review.findings?.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {review.findings.map((f, i) => (
                <div key={i} className="rounded-md border p-2.5 space-y-1">
                  <p className={`text-xs font-medium flex items-center gap-1.5 ${SEVERITY[f.severity] ?? ""}`}>
                    <AlertTriangle className="size-3.5" /> {f.title}
                    <Badge variant="outline" className="ml-auto text-[10px]">{f.category}</Badge>
                  </p>
                  <p className="text-[11px] text-muted-foreground">{f.detail}</p>
                  <p className="text-[11px]"><span className="font-medium">Fix:</span> {f.suggestion}</p>
                </div>
              ))}
            </div>
          )}

          {review.improved_code && (
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Improved version</summary>
              <pre className="mt-2 bg-muted rounded-md p-3 overflow-auto max-h-64 whitespace-pre-wrap font-mono text-[11px]">
                {review.improved_code}
              </pre>
            </details>
          )}
        </div>
      )}
    </Card>
  );
}
