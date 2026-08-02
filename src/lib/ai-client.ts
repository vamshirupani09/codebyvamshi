import { supabase } from "@/integrations/supabase/client";

/**
 * Calls the shared multi-agent edge function in JSON mode.
 * Existing streaming callers are untouched — this only opts into `json: true`.
 */
export async function askAgentJson<T>(agent: string, prompt: string, context?: string): Promise<T> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Please sign in to use AI features.");

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ agent, prompt, context, json: true }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Please sign in to use AI features.");
    if (res.status === 429) throw new Error("Rate limited. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in your workspace.");
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "AI request failed");
  }

  const data = (await res.json()) as { result: T };
  return data.result;
}
