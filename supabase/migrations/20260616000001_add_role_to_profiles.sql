-- Accounts are parent-rooted (COPPA-driven): the parent is the account root,
-- consent-giver, and entitlement holder; students are profiles provisioned
-- underneath. `role` distinguishes the two. It stays NULL until onboarding
-- assigns it — a freshly auto-created profile (incl. anonymous try-before-buy
-- users) has no role yet, and the parent onboarding flow sets 'parent', then
-- provisions 'student' profiles. See the project_accounts_architecture memory.
alter table public.profiles
  add column if not exists role text;

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (
    role is null or role in ('parent', 'student')
  );

comment on column public.profiles.role is
  'Account role: parent | student | null (unset until onboarding). Parent-rooted model.';
