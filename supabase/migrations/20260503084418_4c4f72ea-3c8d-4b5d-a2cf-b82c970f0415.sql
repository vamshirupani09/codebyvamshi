
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles select own" on public.profiles for select using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- dsa progress
create table public.dsa_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, topic)
);
alter table public.dsa_progress enable row level security;
create policy "progress own" on public.dsa_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- assignments (shared)
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  problem_url text not null,
  difficulty text,
  week_number int not null default 1,
  due_date timestamptz,
  created_at timestamptz not null default now()
);
alter table public.assignments enable row level security;
create policy "assignments read all" on public.assignments for select to authenticated using (true);

-- assignment completions
create table public.assignment_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, assignment_id)
);
alter table public.assignment_completions enable row level security;
create policy "completions own" on public.assignment_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- bookmarks
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_title text not null,
  problem_url text not null,
  topic text,
  created_at timestamptz not null default now()
);
alter table public.bookmarks enable row level security;
create policy "bookmarks own" on public.bookmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text,
  type text default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications own" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- seed assignments
insert into public.assignments (title, description, problem_url, difficulty, week_number, due_date) values
('Two Sum', 'Find two indices that sum to target', 'https://leetcode.com/problems/two-sum/', 'Easy', 1, now() + interval '7 days'),
('Valid Parentheses', 'Check if brackets are balanced', 'https://leetcode.com/problems/valid-parentheses/', 'Easy', 1, now() + interval '7 days'),
('Merge Two Sorted Lists', 'Merge two sorted linked lists', 'https://leetcode.com/problems/merge-two-sorted-lists/', 'Easy', 1, now() + interval '7 days'),
('Maximum Subarray', 'Kadane''s algorithm', 'https://leetcode.com/problems/maximum-subarray/', 'Medium', 2, now() + interval '14 days'),
('Climbing Stairs', 'Classic DP intro', 'https://leetcode.com/problems/climbing-stairs/', 'Easy', 2, now() + interval '14 days'),
('Binary Tree Inorder Traversal', 'Tree traversal', 'https://leetcode.com/problems/binary-tree-inorder-traversal/', 'Easy', 3, now() + interval '21 days'),
('Number of Islands', 'Graph DFS/BFS', 'https://leetcode.com/problems/number-of-islands/', 'Medium', 3, now() + interval '21 days'),
('Course Schedule', 'Topological sort', 'https://leetcode.com/problems/course-schedule/', 'Medium', 4, now() + interval '28 days');
