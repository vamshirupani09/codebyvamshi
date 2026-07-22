// AI Resume Score Checker — Lovable AI Gateway
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are an elite technical recruiter and ATS scanner.
Analyze the resume text and return STRICT JSON only (no markdown, no prose) matching this schema:
{
  "overall_score": <int 0-100>,
  "summary": "<2-3 sentence overall verdict>",
  "breakdown": {
    "ats_compatibility": <int 0-100>,
    "technical_skills": <int 0-100>,
    "projects": <int 0-100>,
    "experience": <int 0-100>,
    "education": <int 0-100>,
    "achievements": <int 0-100>,
    "keywords": <int 0-100>,
    "formatting": <int 0-100>,
    "grammar": <int 0-100>,
    "readability": <int 0-100>,
    "impact": <int 0-100>
  },
  "strengths": [<string>, ...5-8 items],
  "weaknesses": [<string>, ...5-8 items],
  "missing_keywords": [<string>, ...8-15 items relevant to target role],
  "action_verbs_suggestions": [<string>, ...5-8 stronger verbs to use],
  "improved_bullets": [
    { "original": "<weak bullet from resume>", "improved": "<stronger STAR-format version>" },
    ...4-6 items
  ],
  "section_feedback": {
    "summary_section": "<feedback>",
    "experience_section": "<feedback>",
    "projects_section": "<feedback>",
    "skills_section": "<feedback>",
    "education_section": "<feedback>"
  },
  "ats_issues": [<string>, ...],
  "grammar_issues": [<string>, ...],
  "recommended_certifications": [<string>, ...3-6 items],
  "missing_links": [<string e.g. "GitHub", "LinkedIn", "Portfolio">, ...],
  "top_priority_actions": [<string>, ...top 5 highest-impact next steps]
}
Score conservatively. A 90+ score requires an exceptional resume. Return ONLY the JSON object.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { resume_text, target_role, file_name } = await req.json();
    if (!resume_text || typeof resume_text !== "string") return json({ error: "resume_text required" }, 400);
    if (resume_text.length < 100) return json({ error: "Resume text too short — is the file readable?" }, 400);

    const trimmed = resume_text.slice(0, 18000);
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    const userMsg = `Target role: ${target_role || "Software Engineer / SDE"}\n\nResume text:\n---\n${trimmed}\n---\n\nReturn the JSON report now.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return json({ error: "Rate limit exceeded. Try again shortly." }, 429);
      if (res.status === 402) return json({ error: "AI credits exhausted." }, 402);
      const t = await res.text();
      console.error("gateway error", res.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let report: Record<string, unknown>;
    try {
      report = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      report = m ? JSON.parse(m[0]) : {};
    }

    const overall = Math.max(0, Math.min(100, Math.round(Number(report.overall_score) || 0)));

    const { data: saved, error: insertErr } = await supabase
      .from("resume_analyses")
      .insert({
        user_id: user.id,
        file_name: file_name || "resume",
        overall_score: overall,
        report,
        resume_text: trimmed,
      })
      .select("id, created_at")
      .single();

    if (insertErr) console.error("insert err", insertErr);

    return json({ id: saved?.id, created_at: saved?.created_at, overall_score: overall, report });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
