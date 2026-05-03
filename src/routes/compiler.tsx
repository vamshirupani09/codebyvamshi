import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PISTON_LANGUAGES, type LangId } from "@/lib/dsa-data";

export const Route = createFileRoute("/compiler")({
  component: () => (
    <DashboardLayout>
      <Compiler />
    </DashboardLayout>
  ),
});

function Compiler() {
  const [lang, setLang] = useState<LangId>("python");
  const config = PISTON_LANGUAGES.find((l) => l.id === lang)!;
  const [code, setCode] = useState(config.starter);
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  const onLang = (id: string) => {
    const cfg = PISTON_LANGUAGES.find((l) => l.id === id)!;
    setLang(cfg.id);
    setCode(cfg.starter);
    setOutput("");
  };

  const run = async () => {
    setRunning(true);
    setOutput("");
    try {
      const res = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: config.id,
          version: config.version,
          files: [{ content: code }],
          stdin,
        }),
      });
      const data = await res.json();
      const out = (data.run?.stdout ?? "") + (data.run?.stderr ? `\n${data.run.stderr}` : "");
      setOutput(out || "(no output)");
    } catch (e: any) {
      toast.error("Execution failed");
      setOutput(String(e?.message ?? e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Online Compiler</h1>
          <p className="text-sm text-muted-foreground">Powered by Piston — write, run, iterate.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={lang} onValueChange={onLang}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PISTON_LANGUAGES.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={run} disabled={running}>
            {running ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Play className="size-4 mr-2" />}
            Run
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden p-0">
          <Editor
            height="520px"
            language={config.monaco}
            value={code}
            onChange={(v) => setCode(v ?? "")}
            theme="vs-dark"
            options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "JetBrains Mono, monospace" }}
          />
        </Card>
        <div className="space-y-4">
          <Card className="p-4">
            <p className="text-sm font-medium mb-2">Custom input (stdin)</p>
            <Textarea rows={5} value={stdin} onChange={(e) => setStdin(e.target.value)} placeholder="Optional input…" className="font-mono text-xs" />
          </Card>
          <Card className="p-4">
            <p className="text-sm font-medium mb-2">Output</p>
            <pre className="text-xs bg-muted rounded-md p-3 min-h-[260px] whitespace-pre-wrap font-mono">{output || "Run your code to see output."}</pre>
          </Card>
        </div>
      </div>
    </div>
  );
}
