
CREATE TABLE public.user_stats (
  user_id uuid PRIMARY KEY,
  xp integer NOT NULL DEFAULT 0,
  coins integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_stats own" ON public.user_stats FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  label text,
  language text,
  topic text,
  xp integer NOT NULL DEFAULT 0,
  coins integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_log_user_created_idx ON public.activity_log (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity own" ON public.activity_log FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_key)
);
GRANT SELECT, INSERT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges own" ON public.user_badges FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.award_activity(
  _type text,
  _xp integer DEFAULT 10,
  _coins integer DEFAULT 5,
  _label text DEFAULT NULL,
  _language text DEFAULT NULL,
  _topic text DEFAULT NULL
)
RETURNS public.user_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  s public.user_stats;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.activity_log (user_id, activity_type, label, language, topic, xp, coins)
  VALUES (uid, _type, _label, _language, _topic, GREATEST(_xp, 0), GREATEST(_coins, 0));

  INSERT INTO public.user_stats (user_id, xp, coins, current_streak, longest_streak, last_active_date)
  VALUES (uid, GREATEST(_xp, 0), GREATEST(_coins, 0), 1, 1, today)
  ON CONFLICT (user_id) DO UPDATE SET
    xp = public.user_stats.xp + GREATEST(_xp, 0),
    coins = public.user_stats.coins + GREATEST(_coins, 0),
    current_streak = CASE
      WHEN public.user_stats.last_active_date = today THEN public.user_stats.current_streak
      WHEN public.user_stats.last_active_date = today - 1 THEN public.user_stats.current_streak + 1
      ELSE 1 END,
    longest_streak = GREATEST(
      public.user_stats.longest_streak,
      CASE
        WHEN public.user_stats.last_active_date = today THEN public.user_stats.current_streak
        WHEN public.user_stats.last_active_date = today - 1 THEN public.user_stats.current_streak + 1
        ELSE 1 END),
    last_active_date = today,
    updated_at = now()
  RETURNING * INTO s;

  RETURN s;
END;
$$;
GRANT EXECUTE ON FUNCTION public.award_activity(text, integer, integer, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit integer DEFAULT 20)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  xp integer,
  coins integer,
  current_streak integer,
  longest_streak integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.user_id,
         COALESCE(NULLIF(p.full_name, ''), 'Learner ' || left(s.user_id::text, 4)) AS display_name,
         s.xp, s.coins, s.current_streak, s.longest_streak
  FROM public.user_stats s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  ORDER BY s.xp DESC, s.longest_streak DESC
  LIMIT LEAST(GREATEST(_limit, 1), 100);
$$;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;
