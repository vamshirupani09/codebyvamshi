
REVOKE ALL ON FUNCTION public.award_activity(text, integer, integer, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_leaderboard(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_activity(text, integer, integer, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;
