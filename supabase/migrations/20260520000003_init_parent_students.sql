-- Parent <-> student link table for the parent dashboard.
create table if not exists public.parent_students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint parent_students_unique unique (parent_id, student_id),
  constraint parent_students_distinct check (parent_id <> student_id)
);

create index if not exists parent_students_parent_idx
  on public.parent_students (parent_id);
create index if not exists parent_students_student_idx
  on public.parent_students (student_id);

alter table public.parent_students enable row level security;

-- Parents see their own links; students see links naming them.
drop policy if exists "parent_students_select_involved" on public.parent_students;
create policy "parent_students_select_involved"
  on public.parent_students
  for select
  using (auth.uid() = parent_id or auth.uid() = student_id);

-- Only a parent may create or remove a link to a student.
drop policy if exists "parent_students_insert_self" on public.parent_students;
create policy "parent_students_insert_self"
  on public.parent_students
  for insert
  with check (auth.uid() = parent_id);

drop policy if exists "parent_students_delete_self" on public.parent_students;
create policy "parent_students_delete_self"
  on public.parent_students
  for delete
  using (auth.uid() = parent_id);

-- Parents can read their linked students' profile rows.
drop policy if exists "profiles_select_linked_student" on public.profiles;
create policy "profiles_select_linked_student"
  on public.profiles
  for select
  using (
    exists (
      select 1
      from public.parent_students ps
      where ps.student_id = public.profiles.id
        and ps.parent_id = auth.uid()
    )
  );

-- Parents can read their linked students' lesson_progress rows.
drop policy if exists "lesson_progress_select_linked_student"
  on public.lesson_progress;
create policy "lesson_progress_select_linked_student"
  on public.lesson_progress
  for select
  using (
    exists (
      select 1
      from public.parent_students ps
      where ps.student_id = public.lesson_progress.user_id
        and ps.parent_id = auth.uid()
    )
  );
