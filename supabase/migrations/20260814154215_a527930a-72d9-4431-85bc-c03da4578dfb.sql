CREATE TABLE public.github_connections (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  name text,
  avatar_url text,
  bio text,
  public_repos integer NOT NULL DEFAULT 0,
  followers integer NOT NULL DEFAULT 0,
  html_url text,
  connected_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.github_connections TO authenticated;
GRANT ALL ON public.github_connections TO service_role;
ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "github connection own" ON public.github_connections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.github_repo_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_full_name text NOT NULL,
  repo_url text,
  health_score integer NOT NULL DEFAULT 0,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.github_repo_reviews TO authenticated;
GRANT ALL ON public.github_repo_reviews TO service_role;
ALTER TABLE public.github_repo_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "github reviews own" ON public.github_repo_reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX github_repo_reviews_user_idx ON public.github_repo_reviews(user_id, created_at DESC);