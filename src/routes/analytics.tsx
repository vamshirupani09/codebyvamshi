import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Flame, Coins, Zap, Trophy, Medal } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ROADMAP } from "@/lib/dsa-data";
import {
  BADGES,
  fetchLeaderboard,
  levelFromXp,
  levelTitle,
  syncBadges,
  type ActivityRow,
  type LeaderRow,
  type UserStats,
} from "@/lib/gamification";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Progress Analytics | Codex AI Coding Assistant" },
      {
        name: "description",
        content:
          "Track XP, coins, streaks, badges, topic mastery, language usage and a daily activity heatmap across your coding practice.",
      },
      { property: "og:title", content: "Progress Analytics | Codex AI Coding Assistant" },
      {
        property: "og:description",
        content: "XP, coins, streaks, badges, leaderboard and interactive charts for your coding journey.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <DashboardLayout>
      <Analytics />
    </DashboardLayout>
  ),
});

const DAY = 86_400_000;
const CHART_COLORS = ["#6366f1", "#f97316", "#10b981", "#eab308", "#ec4899", "#06b6d4", "#a855f7", "#ef4444"];

function dayKey(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

function Analytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [topicsDone, setTopicsDone] = useState(0);
  const [assignmentsDone, setAssignmentsDone] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 180 * DAY).toISOString();
      const [statsRes, actRes, badgeRes, progRes, acRes, board] = await Promise.all([
        supabase.from("user_stats" as never).select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("activity_log" as never)
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(2000),
        supabase.from("user_badges" as never).select("badge_key").eq("user_id", user.id),
        supabase.from("dsa_progress").select("topic").eq("user_id", user.id).eq("completed", true),
        supabase.from("assignment_completions").select("id").eq("user_id", user.id),
        fetchLeaderboard(10),
      ]);
      if (cancelled) return;

      const s = (statsRes.data as UserStats | null) ?? null;
      const acts = (actRes.data as ActivityRow[] | null) ?? [];
      const known = new Set(
        ((badgeRes.data as { badge_key: string }[] | null) ?? []).map((b) => b.badge_key),
      );
      const tDone = progRes.data?.length ?? 0;
      const aDone = acRes.data?.length ?? 0;

      setStats(s);
      setActivities(acts);
      setTopicsDone(tDone);
      setAssignmentsDone(aDone);
      setLeaders(board);
      setLoading(false);

      const unlocked = await syncBadges(
        user.id,
        { stats: s, activities: acts, topicsDone: tDone, assignmentsDone: aDone },
        known,
      );
      if (cancelled) return;
      unlocked.forEach((b) => known.add(b.key));
      setEarned(new Set(known));
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const level = levelFromXp(stats?.xp ?? 0);

  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    activities.forEach((a) => m.set(dayKey(a.created_at), (m.get(dayKey(a.created_at)) ?? 0) + 1));
    return m;
  }, [activities]);

  const xpTrend = useMemo(() => {
    const m = new Map<string, number>();
    activities.forEach((a) => m.set(dayKey(a.created_at), (m.get(dayKey(a.created_at)) ?? 0) + a.xp));
    const out: { date: string; xp: number }[] = [];
    let running = 0;
    for (let i = 29; i >= 0; i--) {
      const k = dayKey(new Date(Date.now() - i * DAY));
      running += m.get(k) ?? 0;
      out.push({ date: k.slice(5), xp: running });
    }
    return out;
  }, [activities]);

  const languageData = useMemo(() => {
    const m = new Map<string, number>();
    activities.filter((a) => a.language).forEach((a) => m.set(a.language!, (m.get(a.language!) ?? 0) + 1));
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [activities]);

  const activityMix = useMemo(() => {
    const m = new Map<string, number>();
    activities.forEach((a) => m.set(a.activity_type, (m.get(a.activity_type) ?? 0) + 1));
    return [...m.entries()].map(([name, value]) => ({
      name: name.replace(/_/g, " "),
      value,
    }));
  }, [activities]);

  const heatmapWeeks = useMemo(() => {
    const weeks: { date: string; count: number }[][] = [];
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    const start = new Date(end.getTime() - 26 * 7 * DAY - end.getUTCDay() * DAY);
    for (let w = 0; w < 27; w++) {
      const week: { date: string; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(start.getTime() + (w * 7 + d) * DAY);
        if (day > end) break;
        const k = dayKey(day);
        week.push({ date: k, count: byDay.get(k) ?? 0 });
      }
      if (week.length) weeks.push(week);
    }
    return weeks;
  }, [byDay]);

  const badgeCtx = { stats, activities, topicsDone, assignmentsDone };
  const earnedCount = BADGES.filter((b) => earned.has(b.key) || b.earned(badgeCtx)).length;

  const cells = [
    { icon: Zap, label: "Total XP", value: (stats?.xp ?? 0).toLocaleString(), tone: "text-primary" },
    { icon: Coins, label: "Coins", value: (stats?.coins ?? 0).toLocaleString(), tone: "text-amber-500" },
    { icon: Flame, label: "Current streak", value: `${stats?.current_streak ?? 0}d`, tone: "text-orange-500" },
    { icon: Trophy, label: "Badges", value: `${earnedCount}/${BADGES.length}`, tone: "text-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Your XP, streaks, badges and practice patterns — updated as you learn.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cells.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{c.label}</span>
              <c.icon className={`size-4 ${c.tone}`} />
            </div>
            <p className="font-display text-2xl sm:text-3xl mt-2">{c.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-display text-xl">
              Level {level.level} · {levelTitle(level.level)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {level.intoLevel} / {level.needed} XP to level {level.level + 1}
            </p>
          </div>
          <Badge variant="secondary">Longest streak {stats?.longest_streak ?? 0} days</Badge>
        </div>
        <Progress value={level.pct} className="mt-4" />
      </Card>

      <Card className="p-5 overflow-hidden">
        <p className="font-display text-lg">Activity heatmap</p>
        <p className="text-xs text-muted-foreground mb-4">Last 6 months of practice</p>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-[3px] min-w-max">
            {heatmapWeeks.map((week, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {week.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.count} activities`}
                    className={`size-[11px] rounded-[2px] ${
                      d.count === 0
                        ? "bg-muted"
                        : d.count < 3
                          ? "bg-primary/30"
                          : d.count < 6
                            ? "bg-primary/55"
                            : d.count < 10
                              ? "bg-primary/80"
                              : "bg-primary"
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="font-display text-lg mb-4">XP growth (30 days)</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={xpTrend}>
                <defs>
                  <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={5} />
                <YAxis tick={{ fontSize: 10 }} width={38} />
                <Tooltip />
                <Area type="monotone" dataKey="xp" stroke="#6366f1" fill="url(#xpFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-display text-lg mb-4">Languages used</p>
          <div className="h-[220px]">
            {languageData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Run some code to populate this chart.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={languageData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={30} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {languageData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-display text-lg mb-4">Where your time goes</p>
          <div className="h-[220px]">
            {activityMix.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={activityMix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                    {activityMix.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-display text-lg mb-1">Topic mastery</p>
          <p className="text-xs text-muted-foreground mb-4">
            {topicsDone}/{ROADMAP.length} roadmap topics · {assignmentsDone} assignments done
          </p>
          <Progress value={Math.round((topicsDone / Math.max(ROADMAP.length, 1)) * 100)} />
          <ul className="mt-4 space-y-1.5 max-h-[150px] overflow-auto text-sm">
            {ROADMAP.map((t) => (
              <li key={t.topic} className="flex items-center justify-between gap-2">
                <span className="truncate">{t.topic}</span>
                <span className="text-xs text-muted-foreground shrink-0">{t.items.length} items</span>
              </li>
            ))}
          </ul>

        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="font-display text-lg mb-4">Badges</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BADGES.map((b) => {
              const has = earned.has(b.key) || b.earned(badgeCtx);
              return (
                <div
                  key={b.key}
                  title={b.description}
                  className={`rounded-xl border p-3 text-center transition-colors ${
                    has ? "border-primary/40 bg-primary/5" : "opacity-45"
                  }`}
                >
                  <div className="text-2xl">{b.emoji}</div>
                  <p className="text-xs font-medium mt-1 leading-tight">{b.name}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-display text-lg mb-4">Leaderboard</p>
          {leaders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading…" : "No ranked learners yet — earn XP to claim the top spot."}
            </p>
          ) : (
            <ul className="divide-y">
              {leaders.map((l, i) => (
                <li
                  key={l.user_id}
                  className={`flex items-center gap-3 py-2.5 ${l.user_id === user?.id ? "font-medium" : ""}`}
                >
                  <span className="w-6 text-sm text-muted-foreground tabular-nums">{i + 1}</span>
                  {i < 3 ? (
                    <Medal
                      className={`size-4 ${i === 0 ? "text-amber-500" : i === 1 ? "text-zinc-400" : "text-orange-700"}`}
                    />
                  ) : (
                    <span className="size-4" />
                  )}
                  <span className="flex-1 truncate text-sm">
                    {l.display_name}
                    {l.user_id === user?.id && " (you)"}
                  </span>
                  <span className="text-xs text-muted-foreground">🔥{l.current_streak}</span>
                  <span className="text-sm tabular-nums">{l.xp.toLocaleString()} XP</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
