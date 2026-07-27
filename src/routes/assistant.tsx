import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Bug, FlaskConical, BookOpen, Loader2, Send, Gauge, Sparkles, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { awardActivity } from "@/lib/gamification";

export const Route = createFileRoute("/assistant")({
  component: () => (
    <DashboardLayout>
      <Assistant />
    </DashboardLayout>
  ),
});

const AGENTS = [
  { id: "coder", label: "Coder", icon: Bot, hint: "Generate optimized code from a problem statement." },
  { id: "debugger", label: "Debugger", icon: Bug, hint: "Paste buggy code; get bugs identified and a fix." },
  { id: "testcase", label: "Tests", icon: FlaskConical, hint: "Generate edge-case test cases as a table." },
  { id: "explainer", label: "Explainer", icon: BookOpen, hint: "Walk through the code step by step." },
  { id: "complexity", label: "Complexity", icon: Gauge, hint: "Time & space complexity with derivation." },
  { id: "optimizer", label: "Optimizer", icon: Sparkles, hint: "Refactor to a cleaner, faster version." },
  { id: "hint", label: "Hints", icon: Lightbulb, hint: "3 progressive hints — no full solution." },
] as const;

type AgentId = (typeof AGENTS)[number]["id"];

function Assistant() {
  const [agent, setAgent] = useState<AgentId>("coder");
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    if (!prompt.trim()) return toast.error("Describe what you need");
    setBusy(true);
    setOutput("");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ agent, prompt, context }),
      });
      void awardActivity("ai_query", { label: agent });
      if (!res.ok) {
        if (res.status === 401) toast.error("Please sign in to use the assistant.");
        else if (res.status === 429) toast.error("Rate limited. Try again in a moment.");
        else if (res.status === 402) toast.error("AI credits exhausted. Add credits in workspace.");
        else toast.error("AI request failed");
        setBusy(false);
        return;
      }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") { buf = ""; break; }
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) { acc += c; setOutput(acc); }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const current = AGENTS.find((a) => a.id === agent)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">A team of specialized agents at your service.</p>
      </div>

      <Tabs value={agent} onValueChange={(v) => setAgent(v as AgentId)}>
        <TabsList className="grid grid-cols-4 md:grid-cols-7 w-full">
          {AGENTS.map((a) => (
            <TabsTrigger key={a.id} value={a.id} className="gap-1.5">
              <a.icon className="size-4" />
              <span className="hidden md:inline">{a.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {AGENTS.map((a) => (
          <TabsContent key={a.id} value={a.id} className="text-sm text-muted-foreground mt-2">
            {a.hint}
          </TabsContent>
        ))}
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <div>
            <label className="text-sm font-medium">Prompt / Problem</label>
            <Textarea rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Find the longest substring without repeating characters." />
          </div>
          <div>
            <label className="text-sm font-medium">Code / context (optional)</label>
            <Textarea rows={8} value={context} onChange={(e) => setContext(e.target.value)} placeholder="Paste code or extra context here…" className="font-mono text-xs" />
          </div>
          <Button onClick={ask} disabled={busy} className="w-full">
            {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
            Ask {current.label}
          </Button>
        </Card>

        <Card className="p-4">
          <p className="text-sm font-medium mb-2">Response</p>
          <div className="prose prose-sm max-w-none dark:prose-invert min-h-[420px]">
            {output ? <ReactMarkdown>{output}</ReactMarkdown> : <p className="text-muted-foreground text-sm">Output appears here.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
