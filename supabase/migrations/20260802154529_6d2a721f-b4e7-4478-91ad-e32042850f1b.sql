CREATE OR REPLACE FUNCTION public.award_activity(_type text, _xp integer DEFAULT 10, _coins integer DEFAULT 5, _label text DEFAULT NULL::text, _language text DEFAULT NULL::text, _topic text DEFAULT NULL::text)
 RETURNS user_stats
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  s public.user_stats;
  v_xp integer;
  v_coins integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Server-side reward table: client-supplied _xp/_coins are ignored.
  CASE _type
    WHEN 'code_run' THEN v_xp := 5;  v_coins := 1;
    WHEN 'topic_complete' THEN v_xp := 40; v_coins := 15;
    WHEN 'assignment_complete' THEN v_xp := 60; v_coins := 25;
    WHEN 'ai_query' THEN v_xp := 3;  v_coins := 1;
    WHEN 'resume_analysis' THEN v_xp := 25; v_coins := 10;
    WHEN 'bookmark' THEN v_xp := 2;  v_coins := 1;
    ELSE RAISE EXCEPTION 'invalid activity type';
  END CASE;

  INSERT INTO public.activity_log (user_id, activity_type, label, language, topic, xp, coins)
  VALUES (uid, _type, left(_label, 200), left(_language, 50), left(_topic, 200), v_xp, v_coins);

  INSERT INTO public.user_stats (user_id, xp, coins, current_streak, longest_streak, last_active_date)
  VALUES (uid, v_xp, v_coins, 1, 1, today)
  ON CONFLICT (user_id) DO UPDATE SET
    xp = public.user_stats.xp + v_xp,
    coins = public.user_stats.coins + v_coins,
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
$function$;