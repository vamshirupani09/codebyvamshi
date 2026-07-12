// Multi-agent AI assistant using Lovable AI Gateway
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AGENT_PROMPTS: Record<string, string> = {
  coder:
    "You are the Coder Agent. Given a problem statement, produce clean, optimized code. Pick the best language unless the user specifies one. Use markdown code blocks. Briefly note approach in 2-3 lines, then complexity (Time/Space).",
  debugger:
    "You are the Debugger Agent. The user provides buggy code (and optionally an error). Identify each bug clearly as a bulleted list, explain why it fails, then provide a fully corrected version in a single markdown code block.",
  testcase:
    "You are the Testcase Agent. Generate 8-12 test cases (including tricky edge cases: empty input, single element, duplicates, negatives, overflow, max bounds) for the given problem or function. Output a markdown table with columns: # | Input | Expected Output | Category (basic/edge/stress) | Notes.",
  explainer:
    "You are the Explainer Agent. Walk through the given code step-by-step in plain English. Use numbered steps that map to the code. Highlight tricky lines. End with an intuition summary and time/space complexity.",
  complexity:
    "You are the Complexity Analyzer. Analyze the given code or approach. Output four sections in this exact order using ### headings: 'Time Complexity' (Big-O + derivation), 'Space Complexity' (Big-O + why), 'Bottleneck' (which line/loop dominates), 'Can it be improved?' (yes/no + suggested target complexity).",
  optimizer:
    "You are the Optimizer Agent. Given code, propose a more efficient or cleaner version. Structure your reply as: 1) Issues in original (bullets), 2) Optimization strategy (2-3 lines), 3) Optimized code in a markdown code block, 4) Before/After complexity table.",
  hint:
    "You are the Hint Agent. NEVER give the full solution. Give exactly 3 progressive hints as a numbered list — Hint 1: nudges toward the right data structure / observation. Hint 2: suggests the algorithmic technique. Hint 3: outlines the high-level approach in 1-2 sentences without writing code. End with a single line: 'Try again before revealing more.'",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { agent, prompt, context } = await req.json();
    const sys = AGENT_PROMPTS[agent] ?? AGENT_PROMPTS.coder;

    const messages = [
      { role: "system", content: sys },
      { role: "user", content: context ? `${prompt}\n\n---\n\`\`\`\n${context}\n\`\`\`` : prompt },
    ];

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return json({ error: "Rate limit exceeded. Try again shortly." }, 429);
      if (res.status === 402) return json({ error: "AI credits exhausted. Add credits in workspace settings." }, 402);
      const t = await res.text();
      console.error("AI gateway error:", res.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    return new Response(res.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
