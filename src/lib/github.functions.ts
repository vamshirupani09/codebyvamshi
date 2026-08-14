import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  fetchGithubProfile,
  fetchGithubRepos,
  fetchRepoDetail,
  type GithubProfile,
  type GithubRepo,
  type RepoDetail,
} from "./github.server";

export type { GithubProfile, GithubRepo, RepoDetail };

export const getGithubProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { username: string }) => ({ username: String(d.username ?? "").trim() }))
  .handler(async ({ data }) => fetchGithubProfile(data.username));

export const getGithubRepos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { username: string }) => ({ username: String(d.username ?? "").trim() }))
  .handler(async ({ data }) => fetchGithubRepos(data.username));

export const getRepoDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { owner: string; repo: string }) => ({
    owner: String(d.owner ?? "").trim(),
    repo: String(d.repo ?? "").trim(),
  }))
  .handler(async ({ data }) => fetchRepoDetail(data.owner, data.repo));
