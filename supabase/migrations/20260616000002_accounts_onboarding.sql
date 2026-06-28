-- Accounts onboarding: verifiable parental consent record + student profiles.
-- Part of the accounts spine (tasks #4, #5, #8). Apply after 20260616000001.

-- 1. Consent timestamp on the parent's profile.
--    The primary VPC method will be the Stripe card transaction (payments track);
--    consent_at stores whichever VPC step the parent completed.
--    Seam: payments track — when Stripe checkout lands, set consent_at from the
--    webhook handler (stripe.checkout.session.completed) and store the charge id
--    alongside it. For now: checkbox acknowledgment sets this field.
alter table public.profiles
  add column if not exists consent_at timestamptz;

comment on column public.profiles.consent_at is
  'When the parent completed the VPC step. Primary path: Stripe card transaction '
  '(payments track). MVP path: checkbox acknowledgment in the onboarding flow. '
  'NULL = consent not yet given.';

-- 2. Student profiles managed by a parent.
--    Students are COPPA-covered and do not hold their own Supabase auth
--    credentials at this stage — the parent is the root account and
--    consent-giver. `parent_students` (migration 20260520000003) is reserved
--    for when students gain independent sign-in; this table is the MVP
--    source of truth for parent-provisioned student data.
create table if not exists public.student_profiles (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid not null references public.profiles(id) on delete cascade,
  nickname   text not null check (char_length(nickname) between 1 and 30),
  avatar     text not null default 'atom',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_profiles_parent_idx
  on public.student_profiles(parent_id);

-- Reuse the set_updated_at function created in 20260520000001.
drop trigger if exists student_profiles_set_updated_at on public.student_profiles;
create trigger student_profiles_set_updated_at
  before update on public.student_profiles
  for each row execute function public.set_updated_at();

alter table public.student_profiles enable row level security;

drop policy if exists "student_profiles_parent_select" on public.student_profiles;
create policy "student_profiles_parent_select"
  on public.student_profiles for select
  using (auth.uid() = parent_id);

drop policy if exists "student_profiles_parent_insert" on public.student_profiles;
create policy "student_profiles_parent_insert"
  on public.student_profiles for insert
  with check (auth.uid() = parent_id);

drop policy if exists "student_profiles_parent_update" on public.student_profiles;
create policy "student_profiles_parent_update"
  on public.student_profiles for update
  using (auth.uid() = parent_id)
  with check (auth.uid() = parent_id);

drop policy if exists "student_profiles_parent_delete" on public.student_profiles;
create policy "student_profiles_parent_delete"
  on public.student_profiles for delete
  using (auth.uid() = parent_id);
