export interface PortfolioReview {
  health_score: number;
  verdict: string;
  summary: string;
  categories: Array<{ name: string; score: number; comment: string }>;
  strengths: string[];
  next_steps: string[];
  recruiter_pitch: string;
}

export interface PortfolioAuthor {
  username: string;
  name: string | null;
  avatar_url: string | null;
  html_url: string | null;
}

export interface PortfolioDoc {
  repoFullName: string;
  repoUrl: string;
  review: PortfolioReview;
  author: PortfolioAuthor;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildPortfolioHtml({ repoFullName, repoUrl, review, author }: PortfolioDoc): string {
  const score = Math.max(0, Math.min(100, Math.round(review.health_score ?? 0)));
  const date = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const cats = (review.categories ?? []).slice(0, 6);
  const strengths = (review.strengths ?? []).slice(0, 5);
  const steps = (review.next_steps ?? []).slice(0, 4);

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${esc(repoFullName)} — Portfolio Summary</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { --ink:#141414; --muted:#6b6b6b; --line:#e4e2dd; --accent:#1f6f4a; --bg:#faf9f6; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
    font-family: ui-sans-serif, -apple-system, "Segoe UI", Inter, system-ui, sans-serif; }
  .page { width:210mm; min-height:297mm; margin:0 auto; padding:16mm 15mm; background:#fff; }
  h1,h2 { font-family: Fraunces, Georgia, serif; margin:0; font-weight:600; }
  h1 { font-size:26px; }
  h2 { font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin-bottom:8px; }
  header { display:flex; gap:16px; align-items:center; border-bottom:1px solid var(--line); padding-bottom:14px; }
  header img { width:56px; height:56px; border-radius:50%; object-fit:cover; }
  .who { flex:1; min-width:0; }
  .who p { margin:2px 0 0; font-size:13px; color:var(--muted); }
  .ring { width:86px; height:86px; border-radius:50%; display:grid; place-items:center;
    background: conic-gradient(var(--accent) ${score * 3.6}deg, var(--line) 0deg); }
  .ring > div { width:66px; height:66px; border-radius:50%; background:#fff; display:grid; place-items:center; text-align:center; }
  .ring b { font-size:20px; font-family:Fraunces, Georgia, serif; }
  .ring span { display:block; font-size:9px; color:var(--muted); }
  section { margin-top:18px; }
  .lead { font-size:14px; line-height:1.55; }
  .pitch { border-left:3px solid var(--accent); padding:6px 0 6px 12px; font-style:italic; font-size:14px; line-height:1.5; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 20px; }
  .cat { font-size:12.5px; }
  .cat .top { display:flex; justify-content:space-between; font-weight:600; }
  .bar { height:6px; border-radius:99px; background:var(--line); margin:5px 0 4px; overflow:hidden; }
  .bar i { display:block; height:100%; background:var(--accent); }
  .cat p { margin:0; color:var(--muted); line-height:1.45; }
  ul { margin:0; padding-left:18px; font-size:13px; line-height:1.6; }
  footer { margin-top:22px; border-top:1px solid var(--line); padding-top:10px;
    font-size:11px; color:var(--muted); display:flex; justify-content:space-between; gap:12px; }
  a { color:var(--accent); text-decoration:none; }
  @media print { body { background:#fff; } .page { width:auto; min-height:0; padding:12mm; } @page { size:A4; margin:0; } }
</style></head>
<body><main class="page">
  <header>
    ${author.avatar_url ? `<img src="${esc(author.avatar_url)}" alt="${esc(author.username)} avatar" />` : ""}
    <div class="who">
      <h1>${esc(author.name ?? author.username)}</h1>
      <p><a href="${esc(author.html_url ?? `https://github.com/${author.username}`)}">github.com/${esc(author.username)}</a></p>
      <p><strong>${esc(repoFullName)}</strong> — ${esc(review.verdict ?? "")}</p>
    </div>
    <div class="ring"><div><b>${score}</b><span>health</span></div></div>
  </header>

  <section>
    <h2>Project summary</h2>
    <p class="lead">${esc(review.summary ?? "")}</p>
  </section>

  ${review.recruiter_pitch ? `<section><h2>Recruiter pitch</h2><p class="pitch">${esc(review.recruiter_pitch)}</p></section>` : ""}

  ${
    cats.length
      ? `<section><h2>Quality breakdown</h2><div class="grid">${cats
          .map(
            (c) => `<div class="cat"><div class="top"><span>${esc(c.name)}</span><span>${Math.round(
              c.score,
            )}</span></div><div class="bar"><i style="width:${Math.max(0, Math.min(100, Math.round(c.score)))}%"></i></div><p>${esc(
              c.comment ?? "",
            )}</p></div>`,
          )
          .join("")}</div></section>`
      : ""
  }

  ${
    strengths.length
      ? `<section><h2>Highlights</h2><ul>${strengths.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></section>`
      : ""
  }

  ${
    steps.length
      ? `<section><h2>What's next</h2><ul>${steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></section>`
      : ""
  }

  <footer>
    <span>Repository: <a href="${esc(repoUrl)}">${esc(repoUrl)}</a></span>
    <span>Generated ${esc(date)}</span>
  </footer>
</main></body></html>`;
}

export function buildPortfolioMarkdown({ repoFullName, repoUrl, review, author }: PortfolioDoc): string {
  const score = Math.round(review.health_score ?? 0);
  const lines = [
    `# ${author.name ?? author.username} — ${repoFullName}`,
    ``,
    `**Health score:** ${score}/100 · ${review.verdict ?? ""}`,
    `**GitHub:** ${author.html_url ?? `https://github.com/${author.username}`} · **Repo:** ${repoUrl}`,
    ``,
    review.summary ?? "",
  ];
  if (review.recruiter_pitch) lines.push(``, `> ${review.recruiter_pitch}`);
  if ((review.categories ?? []).length) {
    lines.push(``, `## Quality breakdown`);
    review.categories.forEach((c) => lines.push(`- **${c.name} (${Math.round(c.score)})** — ${c.comment ?? ""}`));
  }
  if ((review.strengths ?? []).length) {
    lines.push(``, `## Highlights`);
    review.strengths.forEach((s) => lines.push(`- ${s}`));
  }
  if ((review.next_steps ?? []).length) {
    lines.push(``, `## What's next`);
    review.next_steps.forEach((s) => lines.push(`- ${s}`));
  }
  return lines.join("\n");
}
