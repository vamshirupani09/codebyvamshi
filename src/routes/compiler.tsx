import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { Play, Loader2, Copy, Download, Upload, Maximize2, Minimize2, Square, Check } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PISTON_LANGUAGES, EDITOR_THEMES, type LangId } from "@/lib/dsa-data";

export const Route = createFileRoute("/compiler")({
  component: () => (
    <DashboardLayout>
      <Compiler />
    </DashboardLayout>
  ),
});

const STORAGE_KEY = "codex:compiler";

type Persisted = Record<LangId, string>;

function loadPersisted(): Persisted {
  if (typeof window === "undefined") return {} as Persisted;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {} as Persisted;
  }
}

function Compiler() {
  const [lang, setLang] = useState<LangId>("python");
  const config = PISTON_LANGUAGES.find((l) => l.id === lang)!;
  const [code, setCode] = useState<string>(config.starter);
  const [stdin, setStdin] = useState("");
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [theme, setTheme] = useState<string>("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Hydrate saved code once
  useEffect(() => {
    const saved = loadPersisted();
    if (saved[lang]) setCode(saved[lang]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave
  useEffect(() => {
    const t = setTimeout(() => {
      const saved = loadPersisted();
      saved[lang] = code;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      } catch { /* quota */ }
    }, 400);
    return () => clearTimeout(t);
  }, [code, lang]);

  const onLang = (id: string) => {
    const cfg = PISTON_LANGUAGES.find((l) => l.id === id)!;
    setLang(cfg.id);
    const saved = loadPersisted();
    setCode(saved[cfg.id] ?? cfg.starter);
    setStdout("");
    setStderr("");
    setElapsed(null);
  };

  const run = async () => {
    setRunning(true);
    setStdout("");
    setStderr("");
    setElapsed(null);
    const ctl = new AbortController();
    abortRef.current = ctl;
    const start = performance.now();
    try {
      const res = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctl.signal,
        body: JSON.stringify({
          language: config.id,
          version: config.version,
          files: [{ name: `main.${config.ext}`, content: code }],
          stdin,
        }),
      });
      if (!res.ok) throw new Error(`Runner returned ${res.status}`);
      const data = await res.json();
      setElapsed(Math.round(performance.now() - start));
      setStdout(data.run?.stdout ?? "");
      const errParts = [
        data.compile?.stderr ? `[compile]\n${data.compile.stderr}` : "",
        data.run?.stderr ? `[runtime]\n${data.run.stderr}` : "",
      ].filter(Boolean);
      setStderr(errParts.join("\n\n"));
      if (data.run?.code !== 0 && data.run?.code != null) {
        toast.warning(`Exited with code ${data.run.code}`);
      }
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === "AbortError") {
        toast.info("Execution stopped");
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error("Execution failed");
        setStderr(msg);
      }
    } finally {
      abortRef.current = null;
      setRunning(false);
    }
  };

  const stop = () => abortRef.current?.abort();

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 1200);
  };

  const download = () => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `main.${config.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const upload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCode(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const editorHeight = fullscreen ? "calc(100vh - 180px)" : "520px";

  return (
    <div className={`space-y-4 ${fullscreen ? "fixed inset-0 z-50 bg-background p-4 overflow-auto" : ""}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Online Compiler</h1>
          <p className="text-sm text-muted-foreground">Powered by Piston — write, run, iterate.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={lang} onValueChange={onLang}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PISTON_LANGUAGES.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EDITOR_THEMES.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(fontSize)} onValueChange={(v) => setFontSize(Number(v))}>
            <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[12, 13, 14, 16, 18, 20, 22].map((s) => (
                <SelectItem key={s} value={String(s)}>{s}px</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {running ? (
            <Button variant="destructive" onClick={stop}>
              <Square className="size-4 mr-2" /> Stop
            </Button>
          ) : (
            <Button onClick={run}>
              <Play className="size-4 mr-2" /> Run
            </Button>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-1 ${fullscreen ? "" : "lg:grid-cols-3"} gap-4`}>
        <Card className={`${fullscreen ? "" : "lg:col-span-2"} overflow-hidden p-0`}>
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
            <span className="text-xs text-muted-foreground font-mono">main.{config.ext}</span>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" title="Upload" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" />
              </Button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".py,.js,.ts,.java,.cpp,.c,.txt"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              />
              <Button size="icon" variant="ghost" title="Download" onClick={download}>
                <Download className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" title="Copy" onClick={copy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
              <Button size="icon" variant="ghost" title="Fullscreen" onClick={() => setFullscreen((f) => !f)}>
                {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </Button>
            </div>
          </div>
          <Editor
            height={editorHeight}
            language={config.monaco}
            value={code}
            onChange={(v) => setCode(v ?? "")}
            theme={theme}
            options={{
              minimap: { enabled: false },
              fontSize,
              fontFamily: "JetBrains Mono, monospace",
              lineNumbers: "on",
              automaticLayout: true,
              tabSize: 2,
              scrollBeyondLastLine: false,
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
            }}
          />
        </Card>
        <div className="space-y-4">
          <Card className="p-4">
            <p className="text-sm font-medium mb-2">Custom input (stdin)</p>
            <Textarea rows={4} value={stdin} onChange={(e) => setStdin(e.target.value)} placeholder="Optional input…" className="font-mono text-xs" />
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Output</p>
              {elapsed != null && <span className="text-[10px] text-muted-foreground font-mono">{elapsed}ms</span>}
            </div>
            {running && !stdout && !stderr ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-6">
                <Loader2 className="size-3.5 animate-spin" /> Running…
              </div>
            ) : (
              <pre className="text-xs bg-muted rounded-md p-3 min-h-[140px] max-h-[280px] overflow-auto whitespace-pre-wrap font-mono">
                {stdout || (stderr ? "" : "Run your code to see output.")}
              </pre>
            )}
            {stderr && (
              <>
                <p className="text-sm font-medium mt-3 mb-2 text-destructive">Errors</p>
                <pre className="text-xs bg-destructive/10 text-destructive rounded-md p-3 max-h-[200px] overflow-auto whitespace-pre-wrap font-mono">{stderr}</pre>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
