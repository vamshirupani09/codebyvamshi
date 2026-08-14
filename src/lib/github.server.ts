const API = "https://api.github.com";

const HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "codex-learning-platform",
};

export type GithubProfile = {
  login: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
};

export type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
  license: string | null;
  fork: boolean;
  archived: boolean;
  size: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
};

export type RepoDetail = {
  repo: GithubRepo;
  languages: Array<{ name: string; bytes: number }>;
  readme: string;
  hasReadme: boolean;
  hasLicense: boolean;
  hasDescription: boolean;
  hasTopics: boolean;
  files: string[];
  recentCommits: number;
};

const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;

async function gh<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API}${path}`, { headers: HEADERS });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export async function fetchGithubProfile(username: string): Promise<GithubProfile> {
  if (!USERNAME_RE.test(username)) throw new Error("Enter a valid GitHub username.");
  const p = await gh<Record<string, unknown>>(`/users/${username}`);
  if (!p) throw new Error("GitHub user not found (or rate limit reached). Check the username and try again.");
  return {
    login: String(p.login),
    name: (p.name as string) ?? null,
    avatar_url: (p.avatar_url as string) ?? null,
    bio: (p.bio as string) ?? null,
    public_repos: Number(p.public_repos ?? 0),
    followers: Number(p.followers ?? 0),
    following: Number(p.following ?? 0),
    html_url: String(p.html_url ?? `https://github.com/${username}`),
  };
}

function mapRepo(r: Record<string, unknown>): GithubRepo {
  const license = r.license as { spdx_id?: string; name?: string } | null;
  return {
    id: Number(r.id),
    name: String(r.name),
    full_name: String(r.full_name),
    description: (r.description as string) ?? null,
    html_url: String(r.html_url),
    language: (r.language as string) ?? null,
    stargazers_count: Number(r.stargazers_count ?? 0),
    forks_count: Number(r.forks_count ?? 0),
    open_issues_count: Number(r.open_issues_count ?? 0),
    topics: Array.isArray(r.topics) ? (r.topics as string[]) : [],
    license: license?.spdx_id ?? license?.name ?? null,
    fork: Boolean(r.fork),
    archived: Boolean(r.archived),
    size: Number(r.size ?? 0),
    default_branch: String(r.default_branch ?? "main"),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
    pushed_at: String(r.pushed_at ?? ""),
  };
}

export async function fetchGithubRepos(username: string): Promise<GithubRepo[]> {
  if (!USERNAME_RE.test(username)) throw new Error("Enter a valid GitHub username.");
  const list = await gh<Array<Record<string, unknown>>>(
    `/users/${username}/repos?per_page=100&sort=updated`,
  );
  if (!list) throw new Error("Could not load repositories (user not found or GitHub rate limit).");
  return list.map(mapRepo);
}

export async function fetchRepoDetail(owner: string, repo: string): Promise<RepoDetail> {
  if (!USERNAME_RE.test(owner) || !REPO_RE.test(repo)) throw new Error("Invalid repository.");

  const raw = await gh<Record<string, unknown>>(`/repos/${owner}/${repo}`);
  if (!raw) throw new Error("Repository not found or GitHub rate limit reached.");
  const mapped = mapRepo(raw);

  const [langsRaw, readmeRaw, treeRaw, commitsRaw] = await Promise.all([
    gh<Record<string, number>>(`/repos/${owner}/${repo}/languages`),
    gh<{ content?: string; encoding?: string }>(`/repos/${owner}/${repo}/readme`),
    gh<{ tree?: Array<{ path: string; type: string }> }>(
      `/repos/${owner}/${repo}/git/trees/${mapped.default_branch}?recursive=0`,
    ),
    gh<Array<unknown>>(`/repos/${owner}/${repo}/commits?per_page=30`),
  ]);

  let readme = "";
  if (readmeRaw?.content) {
    try {
      readme = Buffer.from(readmeRaw.content, "base64").toString("utf-8").slice(0, 6000);
    } catch {
      readme = "";
    }
  }

  const languages = Object.entries(langsRaw ?? {})
    .map(([name, bytes]) => ({ name, bytes: Number(bytes) }))
    .sort((a, b) => b.bytes - a.bytes);

  const files = (treeRaw?.tree ?? []).map((t) => t.path).slice(0, 60);

  return {
    repo: mapped,
    languages,
    readme,
    hasReadme: readme.trim().length > 0,
    hasLicense: Boolean(mapped.license),
    hasDescription: Boolean(mapped.description && mapped.description.trim().length > 10),
    hasTopics: mapped.topics.length > 0,
    files,
    recentCommits: Array.isArray(commitsRaw) ? commitsRaw.length : 0,
  };
}
