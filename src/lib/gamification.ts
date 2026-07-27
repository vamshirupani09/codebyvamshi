import { supabase } from "@/integrations/supabase/client";

export interface UserStats {
  user_id: string;
  xp: number;
  coins: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

export interface ActivityRow {
  id: string;
  activity_type: string;
  label: string | null;
  language: string | null;
  topic: string | null;
  xp: number;
  coins: number;
  created_at: string;
}

export interface LeaderRow {
  user_id: string;
  display_name: string;
  xp: number;
  coins: number;
  current_streak: number;
  longest_streak: number;
}

/** Loose RPC access — these functions are newer than the generated types. */
type LooseClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};
const rpc = supabase as unknown as LooseClient;

export const ACTIVITY_REWARDS = {
  code_run: { xp: 5, coins: 1 },
  topic_complete: { xp: 40, coins: 15 },
  assignment_complete: { xp: 60, coins: 25 },
  ai_query: { xp: 3, coins: 1 },
  resume_analysis: { xp: 25, coins: 10 },
  bookmark: { xp: 2, coins: 1 },
} as const;

export type ActivityType = keyof typeof ACTIVITY_REWARDS;

export async function awardActivity(
  type: ActivityType,
  meta: { label?: string; language?: string; topic?: string } = {},
): Promise<UserStats | null> {
  const reward = ACTIVITY_REWARDS[type];
  const { data, error } = await rpc.rpc("award_activity", {
    _type: type,
    _xp: reward.xp,
    _coins: reward.coins,
    _label: meta.label ?? null,
    _language: meta.language ?? null,
    _topic: meta.topic ?? null,
  });
  if (error) return null;
  return (data as UserStats) ?? null;
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderRow[]> {
  const { data, error } = await rpc.rpc("get_leaderboard", { _limit: limit });
  if (error || !Array.isArray(data)) return [];
  return data as LeaderRow[];
}

/* ---------------- levels ---------------- */

/** Level n requires 100 * n * (n+1) / 2 total XP (100, 300, 600, 1000, ...). */
export function levelFromXp(xp: number) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level += 1;
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  return {
    level,
    floor,
    ceiling,
    intoLevel: xp - floor,
    needed: ceiling - floor,
    pct: Math.min(100, Math.round(((xp - floor) / (ceiling - floor)) * 100)),
  };
}

function xpForLevel(level: number) {
  const n = level - 1;
  return (100 * n * (n + 1)) / 2;
}

export const LEVEL_TITLES = [
  "Novice",
  "Apprentice",
  "Coder",
  "Problem Solver",
  "Algorithmist",
  "Strategist",
  "Architect",
  "Grandmaster",
];

export function levelTitle(level: number) {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
}

/* ---------------- badges ---------------- */

export interface BadgeDef {
  key: string;
  name: string;
  description: string;
  emoji: string;
  earned: (ctx: BadgeContext) => boolean;
}

export interface BadgeContext {
  stats: UserStats | null;
  activities: ActivityRow[];
  topicsDone: number;
  assignmentsDone: number;
}

const count = (a: ActivityRow[], t: string) => a.filter((x) => x.activity_type === t).length;

export const BADGES: BadgeDef[] = [
  {
    key: "first_run",
    name: "Hello, World",
    description: "Run your first program in the compiler",
    emoji: "👋",
    earned: (c) => count(c.activities, "code_run") >= 1,
  },
  {
    key: "polyglot",
    name: "Polyglot",
    description: "Run code in 3 different languages",
    emoji: "🌍",
    earned: (c) => new Set(c.activities.filter((a) => a.language).map((a) => a.language)).size >= 3,
  },
  {
    key: "run_50",
    name: "Compiler Addict",
    description: "50 code executions",
    emoji: "⚙️",
    earned: (c) => count(c.activities, "code_run") >= 50,
  },
  {
    key: "topic_5",
    name: "Foundations",
    description: "Complete 5 roadmap topics",
    emoji: "🧱",
    earned: (c) => c.topicsDone >= 5,
  },
  {
    key: "topic_all",
    name: "Roadmap Conqueror",
    description: "Complete every roadmap topic",
    emoji: "🗺️",
    earned: (c) => c.topicsDone >= 12,
  },
  {
    key: "assign_5",
    name: "Consistent",
    description: "Finish 5 assignments",
    emoji: "📘",
    earned: (c) => c.assignmentsDone >= 5,
  },
  {
    key: "streak_7",
    name: "Week Warrior",
    description: "7-day streak",
    emoji: "🔥",
    earned: (c) => (c.stats?.longest_streak ?? 0) >= 7,
  },
  {
    key: "streak_30",
    name: "Unstoppable",
    description: "30-day streak",
    emoji: "🚀",
    earned: (c) => (c.stats?.longest_streak ?? 0) >= 30,
  },
  {
    key: "ai_25",
    name: "Curious Mind",
    description: "Ask the AI agents 25 questions",
    emoji: "🤖",
    earned: (c) => count(c.activities, "ai_query") >= 25,
  },
  {
    key: "resume",
    name: "Job Ready",
    description: "Analyse your resume",
    emoji: "📄",
    earned: (c) => count(c.activities, "resume_analysis") >= 1,
  },
  {
    key: "xp_1000",
    name: "Grinder",
    description: "Earn 1,000 XP",
    emoji: "💎",
    earned: (c) => (c.stats?.xp ?? 0) >= 1000,
  },
  {
    key: "rich",
    name: "Coin Collector",
    description: "Bank 500 coins",
    emoji: "🪙",
    earned: (c) => (c.stats?.coins ?? 0) >= 500,
  },
];

/** Persist newly earned badges; returns the keys unlocked in this call. */
export async function syncBadges(userId: string, ctx: BadgeContext, known: Set<string>) {
  const newly = BADGES.filter((b) => !known.has(b.key) && b.earned(ctx));
  if (newly.length === 0) return [];
  await supabase
    .from("user_badges" as never)
    .insert(newly.map((b) => ({ user_id: userId, badge_key: b.key })) as never);
  return newly;
}
