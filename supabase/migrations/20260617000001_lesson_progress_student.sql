-- Per-student progress: attribute each lesson_progress row to a specific
-- student profile. Part of the multi-student / parent-dashboard work (TASKS #6).
--
-- Model stays parent-rooted: students hold no Supabase auth credentials, so the
-- parent's auth.uid() remains the authenticated owner/writer of every row
-- (user_id). The new student_id says *which child* the progress belongs to.
-- Anonymous / free-play progress (no student chosen yet) leaves student_id NULL.

alter table public.lesson_progress
  add column if not exists student_id uuid
    references public.student_profiles (id) on delete cascade;

comment on column public.lesson_progress.student_id is
  'Which parent-managed student this progress belongs to. NULL = anonymous / '
  'free-play progress recorded before a student was selected. The parent''s '
  'auth user (user_id) always owns the row.';

-- Swap the unique key to include student_id so two children under one parent
-- each get their own row per lesson. NULLS NOT DISTINCT (Postgres 15+) keeps the
-- parent''s own NULL-student rows de-duping correctly instead of piling up.
alter table public.lesson_progress
  drop constraint if exists lesson_progress_unique_user_lesson;

alter table public.lesson_progress
  drop constraint if exists lesson_progress_unique_user_student_lesson;

alter table public.lesson_progress
  add constraint lesson_progress_unique_user_student_lesson
  unique nulls not distinct (user_id, student_id, module_id, lesson_id);

create index if not exists lesson_progress_user_student_idx
  on public.lesson_progress (user_id, student_id);

-- RLS: the parent owns every row (auth.uid() = user_id), so reads/deletes are
-- unchanged. For writes, add a defense-in-depth check — a non-null student_id
-- must reference a student_profiles row owned by the same parent, so a parent
-- can never tag progress with another parent''s student id.
drop policy if exists "lesson_progress_insert_own" on public.lesson_progress;
create policy "lesson_progress_insert_own"
  on public.lesson_progress
  for insert
  with check (
    auth.uid() = user_id
    and (
      student_id is null
      or exists (
        select 1 from public.student_profiles sp
        where sp.id = student_id and sp.parent_id = auth.uid()
      )
    )
  );

drop policy if exists "lesson_progress_update_own" on public.lesson_progress;
create policy "lesson_progress_update_own"
  on public.lesson_progress
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      student_id is null
      or exists (
        select 1 from public.student_profiles sp
        where sp.id = student_id and sp.parent_id = auth.uid()
      )
    )
  );
