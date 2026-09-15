/**
 * Portfolio site + hiring-document builders.
 * Pure string builders — no React, no network. Used by /portfolio for preview,
 * HTML download and print-to-PDF.
 */

export interface PortfolioProject {
  name: string;
  description: string;
  tech: string[];
  highlights: string[];
  url?: string | null;
}

export interface PortfolioContent {
  name: string;
  headline: string;
  tagline: string;
  about: string;
  skills: Array<{ category: string; items: string[] }>;
  projects: PortfolioProject[];
  experience: Array<{ role: string; org: string; period: string; points: string[] }>;
  education: Array<{ degree: string; org: string; period: string }>;
  achievements: string[];
  strengths: string[];
  next_steps: string[];
  recruiter_pitch: string;
  hiring_summary: string;
}

export interface PortfolioRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
}

export interface PortfolioMeta {
  username: string;
  avatar_url: string | null;
  github_url: string;
  email?: string | null;
  resumeScore?: number | null;
}

export type TemplateId = "aurora" | "terminal" | "editorial" | "onepager";

export const TEMPLATES: Array<{ id: TemplateId; name: string; blurb: string; kind: "site" | "doc" }> = [
  { id: "aurora", name: "Aurora", blurb: "Modern gradient hero, cards, live repo grid.", kind: "site" },
  { id: "terminal", name: "Terminal", blurb: "Dark developer console aesthetic, monospace.", kind: "site" },
  { id: "editorial", name: "Editorial", blurb: "Clean serif magazine layout, generous whitespace.", kind: "site" },
  { id: "onepager", name: "Hiring one-pager", blurb: "A4 print document for recruiters.", kind: "doc" },
];

const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const li = (items: string[] = []) => items.map((i) => `<li>${esc(i)}</li>`).join("");
const chips = (items: string[] = [], cls = "chip") => items.map((i) => `<span class="${cls}">${esc(i)}</span>`).join("");

function repoCards(repos: PortfolioRepo[], cls = "repo") {
  return repos
    .map(
      (r) => `<a class="${cls}" href="${esc(r.html_url)}" target="_blank" rel="noreferrer">
      <h4>${esc(r.name)}</h4>
      <p>${esc(r.description ?? "No description provided.")}</p>
      <div class="meta">${r.language ? `<span>${esc(r.language)}</span>` : ""}<span>★ ${r.stargazers_count}</span><span>⑂ ${r.forks_count}</span></div>
    </a>`,
    )
    .join("");
}

function projectBlocks(projects: PortfolioProject[]) {
  return projects
    .map(
      (p) => `<article class="project">
    <h4>${esc(p.name)}${p.url ? ` <a href="${esc(p.url)}" target="_blank" rel="noreferrer">↗</a>` : ""}</h4>
    <p>${esc(p.description)}</p>
    ${p.highlights?.length ? `<ul>${li(p.highlights)}</ul>` : ""}
    <div class="chips">${chips(p.tech ?? [])}</div>
  </article>`,
    )
    .join("");
}

const printCss = `@media print { body{background:#fff} .wrap{box-shadow:none;max-width:none} a{color:inherit} @page{margin:14mm} }`;

/* ------------------------------ Aurora ------------------------------ */
function aurora(c: PortfolioContent, repos: PortfolioRepo[], m: PortfolioMeta) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>${esc(c.name)} — ${esc(c.headline)}</title>
<meta name="description" content="${esc(c.tagline)}" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
:root{--ink:#0d1117;--muted:#5b6472;--line:#e7e9ee;--accent:#1f6f4a;--bg:#f7f8fa}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 ui-sans-serif,-apple-system,"Segoe UI",Inter,system-ui,sans-serif}
.wrap{max-width:980px;margin:0 auto;background:#fff;box-shadow:0 1px 40px rgba(10,20,40,.07)}
h1,h2,h3,h4{font-family:Fraunces,Georgia,serif;margin:0;font-weight:600}
.hero{padding:56px 44px;background:linear-gradient(135deg,#eaf5ef,#f3f0ea 60%,#eef1f7);border-bottom:1px solid var(--line);display:flex;gap:24px;align-items:center;flex-wrap:wrap}
.hero img{width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid #fff}
.hero h1{font-size:40px;line-height:1.1}
.hero p{margin:8px 0 0;color:var(--muted);max-width:52ch}
.links{margin-top:14px;display:flex;gap:10px;flex-wrap:wrap}
.links a{font-size:13px;padding:8px 14px;border-radius:99px;background:var(--accent);color:#fff;text-decoration:none}
.links a.ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}
section{padding:36px 44px;border-bottom:1px solid var(--line)}
h2{font-size:13px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin-bottom:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}
.chip{display:inline-block;font-size:12px;padding:4px 10px;border-radius:99px;background:#f0f2f5;margin:0 6px 6px 0}
.project{border:1px solid var(--line);border-radius:14px;padding:16px}
.project h4{font-size:17px}.project p{margin:6px 0;color:var(--muted);font-size:14px}
.project ul{margin:6px 0;padding-left:18px;font-size:14px}
.project a{color:var(--accent);text-decoration:none}
.repo{display:block;border:1px solid var(--line);border-radius:14px;padding:14px;text-decoration:none;color:inherit;background:#fcfcfd}
.repo h4{font-size:15px}.repo p{margin:6px 0;font-size:13px;color:var(--muted)}
.repo .meta{display:flex;gap:12px;font-size:12px;color:var(--muted)}
ul.plain{margin:0;padding-left:18px}
footer{padding:26px 44px;font-size:13px;color:var(--muted);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
@media(max-width:640px){.hero,section,footer{padding:26px 20px}.hero h1{font-size:30px}}
${printCss}
</style></head><body><div class="wrap">
<header class="hero">
  ${m.avatar_url ? `<img src="${esc(m.avatar_url)}" alt="${esc(c.name)}" />` : ""}
  <div>
    <h1>${esc(c.name)}</h1>
    <p><strong>${esc(c.headline)}</strong> — ${esc(c.tagline)}</p>
    <div class="links">
      <a href="${esc(m.github_url)}" target="_blank" rel="noreferrer">GitHub</a>
      ${m.email ? `<a class="ghost" href="mailto:${esc(m.email)}">Email</a>` : ""}
    </div>
  </div>
</header>
<section><h2>About</h2><p>${esc(c.about)}</p></section>
<section><h2>Skills</h2>${c.skills
    .map((s) => `<div style="margin-bottom:10px"><strong style="font-size:14px">${esc(s.category)}</strong><div style="margin-top:6px">${chips(s.items)}</div></div>`)
    .join("")}</section>
${c.projects?.length ? `<section><h2>Projects</h2><div class="grid">${projectBlocks(c.projects)}</div></section>` : ""}
${repos.length ? `<section><h2>Live from GitHub</h2><div class="grid">${repoCards(repos)}</div></section>` : ""}
${c.experience?.length ? `<section><h2>Experience</h2>${c.experience.map((e) => `<div style="margin-bottom:14px"><strong>${esc(e.role)}</strong> · ${esc(e.org)} <span style="color:var(--muted);font-size:13px">${esc(e.period)}</span><ul class="plain">${li(e.points)}</ul></div>`).join("")}</section>` : ""}
${c.education?.length ? `<section><h2>Education</h2>${c.education.map((e) => `<div><strong>${esc(e.degree)}</strong> · ${esc(e.org)} <span style="color:var(--muted);font-size:13px">${esc(e.period)}</span></div>`).join("")}</section>` : ""}
${c.achievements?.length ? `<section><h2>Achievements</h2><ul class="plain">${li(c.achievements)}</ul></section>` : ""}
<footer><span>${esc(c.recruiter_pitch)}</span><span>github.com/${esc(m.username)}</span></footer>
</div></body></html>`;
}

/* ----------------------------- Terminal ----------------------------- */
function terminal(c: PortfolioContent, repos: PortfolioRepo[], m: PortfolioMeta) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>${esc(c.name)} — ${esc(c.headline)}</title>
<meta name="description" content="${esc(c.tagline)}" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
:root{--bg:#0d1117;--panel:#131a23;--ink:#d9e2ec;--muted:#8b98a9;--accent:#4ade80;--line:#232c38}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);
 font:15px/1.65 ui-monospace,SFMono-Regular,"JetBrains Mono",Menlo,monospace}
.wrap{max-width:920px;margin:0 auto;padding:32px 20px 60px}
h1,h2,h3,h4{margin:0;font-weight:600}
.bar{display:flex;gap:7px;margin-bottom:14px}.bar i{width:11px;height:11px;border-radius:50%;background:#ff5f56;display:block}
.bar i:nth-child(2){background:#ffbd2e}.bar i:nth-child(3){background:#27c93f}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:22px;margin-bottom:18px}
.prompt{color:var(--accent)}
h1{font-size:28px;margin-bottom:6px}
h2{font-size:13px;color:var(--accent);text-transform:lowercase;margin-bottom:12px}
p{color:var(--muted)}
.chip{display:inline-block;font-size:12px;padding:3px 9px;border:1px solid var(--line);border-radius:6px;margin:0 6px 6px 0;color:var(--ink)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.project,.repo{border:1px solid var(--line);border-radius:10px;padding:14px;display:block;text-decoration:none;color:inherit}
.project h4,.repo h4{font-size:15px;color:var(--accent)}
.project p,.repo p{margin:6px 0;font-size:13px}
.project ul{margin:6px 0;padding-left:16px;font-size:13px;color:var(--muted)}
.repo .meta{display:flex;gap:12px;font-size:12px;color:var(--muted)}
ul.plain{margin:0;padding-left:16px;color:var(--muted)}
a{color:var(--accent)}
@media print{body{background:#fff;color:#111}.panel{background:#fff;border-color:#ddd}p,ul.plain{color:#444}@page{margin:12mm}}
</style></head><body><div class="wrap">
<div class="bar"><i></i><i></i><i></i></div>
<div class="panel">
  <p class="prompt">$ whoami</p>
  <h1>${esc(c.name)}</h1>
  <p>${esc(c.headline)} — ${esc(c.tagline)}</p>
  <p class="prompt">$ contact</p>
  <p><a href="${esc(m.github_url)}">${esc(m.github_url)}</a>${m.email ? ` · <a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : ""}</p>
</div>
<div class="panel"><h2>~/about</h2><p>${esc(c.about)}</p></div>
<div class="panel"><h2>~/skills</h2>${c.skills.map((s) => `<div style="margin-bottom:10px"><strong>${esc(s.category)}</strong><div style="margin-top:6px">${chips(s.items)}</div></div>`).join("")}</div>
${c.projects?.length ? `<div class="panel"><h2>~/projects</h2><div class="grid">${projectBlocks(c.projects)}</div></div>` : ""}
${repos.length ? `<div class="panel"><h2>~/github --live</h2><div class="grid">${repoCards(repos)}</div></div>` : ""}
${c.experience?.length ? `<div class="panel"><h2>~/experience</h2>${c.experience.map((e) => `<div style="margin-bottom:12px"><strong>${esc(e.role)}</strong> @ ${esc(e.org)} <span style="color:var(--muted)">${esc(e.period)}</span><ul class="plain">${li(e.points)}</ul></div>`).join("")}</div>` : ""}
${c.education?.length ? `<div class="panel"><h2>~/education</h2>${c.education.map((e) => `<p><strong>${esc(e.degree)}</strong> · ${esc(e.org)} ${esc(e.period)}</p>`).join("")}</div>` : ""}
${c.achievements?.length ? `<div class="panel"><h2>~/achievements</h2><ul class="plain">${li(c.achievements)}</ul></div>` : ""}
<div class="panel"><h2>~/pitch</h2><p>${esc(c.recruiter_pitch)}</p></div>
</div></body></html>`;
}

/* ---------------------------- Editorial ----------------------------- */
function editorial(c: PortfolioContent, repos: PortfolioRepo[], m: PortfolioMeta) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>${esc(c.name)} — ${esc(c.headline)}</title>
<meta name="description" content="${esc(c.tagline)}" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
:root{--ink:#161513;--muted:#6f6a63;--line:#e3ded4;--accent:#8a3b12;--bg:#fbf9f4}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 Georgia,"Times New Roman",serif}
.wrap{max-width:820px;margin:0 auto;padding:60px 28px 70px}
h1,h2,h3,h4{margin:0;font-weight:600}
h1{font-size:46px;line-height:1.05;letter-spacing:-.02em}
.kicker{letter-spacing:.22em;text-transform:uppercase;font-size:11px;color:var(--accent);font-family:ui-sans-serif,system-ui,sans-serif}
.lede{font-size:19px;color:var(--muted);margin-top:14px}
hr{border:0;border-top:1px solid var(--line);margin:34px 0}
h2{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);font-family:ui-sans-serif,system-ui,sans-serif;margin-bottom:12px}
.cols{column-count:2;column-gap:30px}
.chip{display:inline-block;font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;padding:3px 10px;border:1px solid var(--line);border-radius:3px;margin:0 6px 6px 0}
.project{break-inside:avoid;margin-bottom:20px}
.project h4{font-size:19px}.project p{margin:4px 0;color:var(--muted);font-size:15px}
.project ul{margin:4px 0;padding-left:18px;font-size:15px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.repo{display:block;border-top:2px solid var(--ink);padding-top:8px;text-decoration:none;color:inherit}
.repo h4{font-size:16px}.repo p{margin:4px 0;font-size:14px;color:var(--muted)}
.repo .meta{font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;color:var(--muted);display:flex;gap:12px}
ul.plain{margin:0;padding-left:20px}
a{color:var(--accent)}
blockquote{margin:0;border-left:3px solid var(--accent);padding-left:14px;font-style:italic;color:var(--muted)}
@media(max-width:640px){.cols,.grid{column-count:1;grid-template-columns:1fr}h1{font-size:34px}}
${printCss}
</style></head><body><div class="wrap">
<p class="kicker">Portfolio · ${esc(m.username)}</p>
<h1>${esc(c.name)}</h1>
<p class="lede">${esc(c.headline)} — ${esc(c.tagline)}</p>
<p><a href="${esc(m.github_url)}">github.com/${esc(m.username)}</a>${m.email ? ` · <a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : ""}</p>
<hr />
<h2>About</h2><p>${esc(c.about)}</p>
<hr /><h2>Skills</h2><div class="cols">${c.skills.map((s) => `<p style="break-inside:avoid"><strong>${esc(s.category)}</strong><br />${chips(s.items)}</p>`).join("")}</div>
${c.projects?.length ? `<hr /><h2>Selected work</h2>${projectBlocks(c.projects)}` : ""}
${repos.length ? `<hr /><h2>Live repositories</h2><div class="grid">${repoCards(repos)}</div>` : ""}
${c.experience?.length ? `<hr /><h2>Experience</h2>${c.experience.map((e) => `<div style="margin-bottom:16px"><strong>${esc(e.role)}</strong>, ${esc(e.org)} <span style="color:var(--muted)">${esc(e.period)}</span><ul class="plain">${li(e.points)}</ul></div>`).join("")}` : ""}
${c.education?.length ? `<hr /><h2>Education</h2>${c.education.map((e) => `<p><strong>${esc(e.degree)}</strong>, ${esc(e.org)} — ${esc(e.period)}</p>`).join("")}` : ""}
${c.achievements?.length ? `<hr /><h2>Achievements</h2><ul class="plain">${li(c.achievements)}</ul>` : ""}
<hr /><blockquote>${esc(c.recruiter_pitch)}</blockquote>
</div></body></html>`;
}

/* -------------------------- Hiring one-pager ------------------------- */
function onepager(c: PortfolioContent, repos: PortfolioRepo[], m: PortfolioMeta) {
  const score = Math.max(0, Math.min(100, Math.round(m.resumeScore ?? 0)));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>${esc(c.name)} — Hiring summary</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
:root{--ink:#141414;--muted:#6b6b6b;--line:#e4e2dd;--accent:#1f6f4a;--bg:#faf9f6}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:13px/1.55 ui-sans-serif,-apple-system,"Segoe UI",Inter,system-ui,sans-serif}
.page{width:210mm;min-height:297mm;margin:0 auto;padding:15mm 14mm;background:#fff}
h1,h2{font-family:Fraunces,Georgia,serif;margin:0;font-weight:600}
h1{font-size:25px}
h2{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
header{display:flex;gap:14px;align-items:center;border-bottom:1px solid var(--line);padding-bottom:12px}
header img{width:54px;height:54px;border-radius:50%;object-fit:cover}
.who{flex:1;min-width:0}.who p{margin:2px 0 0;color:var(--muted)}
.ring{width:78px;height:78px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--accent) ${score * 3.6}deg,var(--line) 0deg)}
.ring>div{width:60px;height:60px;border-radius:50%;background:#fff;display:grid;place-items:center;text-align:center}
.ring b{font-size:18px;font-family:Fraunces,Georgia,serif}.ring span{display:block;font-size:8px;color:var(--muted)}
section{margin-top:13px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px 22px}
.pitch{border-left:3px solid var(--accent);padding:4px 0 4px 11px;font-style:italic}
ul{margin:0;padding-left:16px}
.chip{display:inline-block;font-size:11px;padding:2px 8px;border:1px solid var(--line);border-radius:99px;margin:0 5px 5px 0}
.proj{break-inside:avoid;margin-bottom:8px}.proj b{font-size:13px}.proj p{margin:2px 0;color:var(--muted)}
.repos{display:grid;grid-template-columns:1fr 1fr;gap:4px 18px;font-size:12px}
.repos a{color:var(--accent);text-decoration:none}
footer{margin-top:16px;border-top:1px solid var(--line);padding-top:8px;font-size:10.5px;color:var(--muted);display:flex;justify-content:space-between;gap:10px}
@media print{body{background:#fff}.page{width:auto;min-height:0;padding:11mm}@page{size:A4;margin:0}}
</style></head><body><main class="page">
<header>
  ${m.avatar_url ? `<img src="${esc(m.avatar_url)}" alt="${esc(c.name)}" />` : ""}
  <div class="who">
    <h1>${esc(c.name)}</h1>
    <p>${esc(c.headline)}</p>
    <p><a href="${esc(m.github_url)}">github.com/${esc(m.username)}</a>${m.email ? ` · ${esc(m.email)}` : ""}</p>
  </div>
  ${score ? `<div class="ring"><div><b>${score}</b><span>resume</span></div></div>` : ""}
</header>
<section><h2>Summary</h2><p>${esc(c.hiring_summary || c.about)}</p></section>
<section><h2>Recruiter pitch</h2><p class="pitch">${esc(c.recruiter_pitch)}</p></section>
<section><h2>Skills</h2>${c.skills.map((s) => `<div><strong>${esc(s.category)}:</strong> ${chips(s.items)}</div>`).join("")}</section>
${c.projects?.length ? `<section><h2>Key projects</h2>${c.projects.slice(0, 4).map((p) => `<div class="proj"><b>${esc(p.name)}</b> — <span>${esc((p.tech ?? []).join(", "))}</span><p>${esc(p.description)}</p></div>`).join("")}</section>` : ""}
<section class="two">
  ${c.strengths?.length ? `<div><h2>Strengths</h2><ul>${li(c.strengths.slice(0, 5))}</ul></div>` : ""}
  ${c.next_steps?.length ? `<div><h2>Growing toward</h2><ul>${li(c.next_steps.slice(0, 4))}</ul></div>` : ""}
</section>
${c.experience?.length ? `<section><h2>Experience</h2>${c.experience.slice(0, 3).map((e) => `<div class="proj"><b>${esc(e.role)}</b> · ${esc(e.org)} <span style="color:var(--muted)">${esc(e.period)}</span><ul>${li(e.points.slice(0, 2))}</ul></div>`).join("")}</section>` : ""}
${c.education?.length ? `<section><h2>Education</h2>${c.education.map((e) => `<div>${esc(e.degree)} · ${esc(e.org)} — ${esc(e.period)}</div>`).join("")}</section>` : ""}
${repos.length ? `<section><h2>Repositories</h2><div class="repos">${repos.slice(0, 6).map((r) => `<span><a href="${esc(r.html_url)}">${esc(r.name)}</a> — ${esc(r.language ?? "code")} · ★${r.stargazers_count}</span>`).join("")}</div></section>` : ""}
<footer><span>Generated by Codex</span><span>${esc(new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }))}</span></footer>
</main></body></html>`;
}

export function buildPortfolioDocument(
  template: TemplateId,
  content: PortfolioContent,
  repos: PortfolioRepo[],
  meta: PortfolioMeta,
): string {
  switch (template) {
    case "terminal":
      return terminal(content, repos, meta);
    case "editorial":
      return editorial(content, repos, meta);
    case "onepager":
      return onepager(content, repos, meta);
    default:
      return aurora(content, repos, meta);
  }
}

/** Opens a print dialog for the given standalone HTML (user saves as PDF). */
export function printHtmlDocument(html: string) {
  const w = window.open("", "_blank", "width=1024,height=768");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
  return true;
}

export function downloadHtmlDocument(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
