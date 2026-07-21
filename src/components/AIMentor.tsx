import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { MessageCircle, X, Send, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "codex:mentor:history";
const SYSTEM_HINT =
  "Codex Mentor covers DSA, OS, DBMS, Networks, System Design, and interview prep. Keep it conversational.";

function loadHistory(): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Msg[]) : [];
  } catch {
    return [];
  }
}

export function AIMentor() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages(loadHistory());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch { /* quota */ }
  }, [messages]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        taRef.current?.focus();
      });
    }
  }, [open, messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        toast.error("Sign in to chat with the mentor.");
        setBusy(false);
        return;
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session.access_token}`,
        },
        body: JSON.stringify({
          agent: "explainer",
          prompt: `${SYSTEM_HINT}\n\nConversation so far:\n${next
            .map((m) => `${m.role === "user" ? "USER" : "MENTOR"}: ${m.content}`)
            .join("\n")}\n\nRespond as MENTOR to the latest USER turn.`,
          context: "",
        }),
      });
      if (!res.ok) {
        if (res.status === 429) toast.error("Rate limited — try again shortly.");
        else if (res.status === 402) toast.error("AI credits exhausted.");
        else toast.error("Mentor is unavailable.");
        setBusy(false);
        return;
      }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      setMessages((p) => [...p, { role: "assistant", content: "" }]);
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
            if (c) {
              acc += c;
              setMessages((prev) => {
                const copy = prev.slice();
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Mentor failed");
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clear = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("History cleared");
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Codex Mentor"
          className="fixed bottom-6 right-6 z-40 size-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition"
        >
          <MessageCircle className="size-6" />
        </button>
      )}

      {open && (
        <Card className="fixed bottom-6 right-6 z-40 w-[min(92vw,400px)] h-[min(75vh,600px)] flex flex-col shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium leading-none">Codex Mentor</p>
                <p className="text-[10px] opacity-80 mt-0.5">DSA · OS · DBMS · Networks</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="size-7 hover:bg-primary-foreground/20" onClick={clear} title="Clear history">
                <Trash2 className="size-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="size-7 hover:bg-primary-foreground/20" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div ref={scrollRef} className="p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-8">
                  <p>👋 Ask me anything about programming, CS fundamentals, or interview prep.</p>
                  <div className="mt-4 grid gap-2 text-left">
                    {[
                      "Explain B+ trees in DBMS",
                      "TCP vs UDP with examples",
                      "How do I approach DP problems?",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="rounded-md border border-border px-3 py-2 text-xs hover:bg-accent"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-pre:my-2 prose-pre:text-[11px]">
                          <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
              {busy && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-3 py-2 bg-muted text-sm flex items-center gap-2">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span className="text-xs text-muted-foreground">Thinking…</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-3 flex items-end gap-2">
            <Textarea
              ref={taRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask the mentor…"
              className="min-h-[40px] max-h-[120px] resize-none text-sm"
            />
            <Button size="icon" onClick={send} disabled={busy || !input.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
