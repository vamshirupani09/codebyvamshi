import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { useServerFn } from "@tanstack/react-start";
import { Play, Loader2, Copy, Download, Upload, Maximize2, Minimize2, Check, Cpu, Timer } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PISTON_LANGUAGES, EDITOR_THEMES, type LangId } from "@/lib/dsa-data";
import { runCode } from "@/lib/judge0.functions";

export const Route = createFileRoute("/compiler")({
  component: () => (
    <DashboardLayout>
      <Compiler />
    </DashboardLayout>
  ),
});

const STORAGE_KEY = "codex:compiler";

type Persisted = Partial<Record<LangId, string>>;

function loadPersisted(): Persisted {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function Compiler() {
  const [lang, setLang] = useState<LangId>("python");
  const config = PISTON_LANGUAGES.find((l) => l.id === lang)!;
  const [code, setCode] = useState<string>(config.starter);
  const [stdin, setStdin] = useState("");
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [status, setStatus] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [runtimeTime, setRuntimeTime] = useState<string>("");
  const [runtimeMem, setRuntimeMem] = useState<string>("");
  const [theme, setTheme] = useState<string>("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const runFn = useServerFn(runCode);

  useEffect(() => {
    const saved = loadPersisted();
    if (saved[lang]) setCode(saved[lang]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setStatus("");
    setElapsed(null);
    setRuntimeTime("");
    setRuntimeMem("");
  };

  const run = async () => {
    setRunning(true);
    setStdout("");
    setStderr("");
    setStatus("");
    setElapsed(null);
    setRuntimeTime("");
    setRuntimeMem("");
    const start = performance.now();
    try {
      const result = await runFn({
        data: { language_id: config.judge0, source_code: code, stdin },
      });
      setElapsed(Math.round(performance.now() - start));
      if (!result.ok) {
        const msg = result.error || "Code runner is unavailable.";
        setStatus(result.status);
        setStderr(msg);
        toast.error(msg);
        return;
      }
      setStdout(result.stdout);
      const errParts = [
        result.compile_output ? `[compile]\n${result.compile_output}` : "",
        result.stderr ? `[runtime]\n${result.stderr}` : "",
        result.message && !result.stdout && !result.stderr && !result.compile_output
          ? `[runner]\n${result.message}`
          : "",
      ].filter(Boolean);
      setStderr(errParts.join("\n\n"));
      setStatus(result.status);
      setRuntimeTime(result.time);
      setRuntimeMem(result.memory);
      if (result.statusId !== 3 && result.statusId !== 0) {
        toast.warning(result.status);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
      setStderr(msg);
    } finally {
      setRunning(false);
    }
  };

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

  const onEditorMount: OnMount = (editor, monaco) => {
    // Ctrl/Cmd+Enter to run
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      run();
    });
    // Ctrl/Cmd+S to save (already autosaved) — noop but stops browser dialog
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      toast.success("Saved");
    });
  };

  const editorHeight = fullscreen ? "calc(100vh - 180px)" : "520px";

  return (
    <div className={`space-y-4 ${fullscreen ? "fixed inset-0 z-50 bg-background p-4 overflow-auto" : ""}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Online Compiler</h1>
          <p className="text-sm text-muted-foreground">
            9 languages · IntelliSense · <kbd className="px-1 rounded bg-muted text-xs">⌘/Ctrl</kbd>+
            <kbd className="px-1 rounded bg-muted text-xs">Enter</kbd> to run
          </p>
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
          <Button onClick={run} disabled={running}>
            {running ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Play className="size-4 mr-2" />}
            Run
          </Button>
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
                accept=".py,.js,.ts,.java,.cpp,.c,.go,.rs,.kt,.txt"
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
            onMount={onEditorMount}
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
              wordBasedSuggestions: "currentDocument",
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        </Card>
        <div className="space-y-4">
          <Card className="p-4">
            <p className="text-sm font-medium mb-2">Custom input (stdin)</p>
            <Textarea rows={4} value={stdin} onChange={(e) => setStdin(e.target.value)} placeholder="Optional input…" className="font-mono text-xs" />
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <p className="text-sm font-medium">Output</p>
              <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                {status && <span className={status === "Accepted" ? "text-emerald-600" : ""}>{status}</span>}
                {runtimeTime && <span className="flex items-center gap-1"><Timer className="size-3" />{runtimeTime}</span>}
                {runtimeMem && <span className="flex items-center gap-1"><Cpu className="size-3" />{runtimeMem}</span>}
                {elapsed != null && <span>·{elapsed}ms rt</span>}
              </div>
            </div>
            {running && !stdout && !stderr ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-6">
                <Loader2 className="size-3.5 animate-spin" /> Executing on remote sandbox…
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
