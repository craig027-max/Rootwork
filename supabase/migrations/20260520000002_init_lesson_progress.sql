-- Lesson progress: one row per (user, lesson) attempt or completion record.
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null,
  module_id text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  score int,
  time_spent_seconds int,
  created_at timestamptz not null default now(),
  constraint lesson_progress_unique_user_lesson unique (user_id, module_id, lesson_id),
  constraint lesson_progress_score_range check (score is null or score between 0 and 100),
  constraint lesson_progress_time_nonneg check (time_spent_seconds is null or time_spent_seconds >= 0)
);

create index if not exists lesson_progress_user_idx
  on public.lesson_progress (user_id);
create index if not exists lesson_progress_user_module_idx
  on public.lesson_progress (user_id, module_id);

alter table public.lesson_progress enable row level security;

-- RLS: users can read/write only their own progress rows.
drop policy if exists "lesson_progress_select_own" on public.lesson_progress;
create policy "lesson_progress_select_own"
  on public.lesson_progress
  for select
  using (auth.uid() = user_id);

drop policy if exists "lesson_progress_insert_own" on public.lesson_progress;
create policy "lesson_progress_insert_own"
  on public.lesson_progress
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "lesson_progress_update_own" on public.lesson_progress;
create policy "lesson_progress_update_own"
  on public.lesson_progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "lesson_progress_delete_own" on public.lesson_progress;
create policy "lesson_progress_delete_own"
  on public.lesson_progress
  for delete
  using (auth.uid() = user_id);
