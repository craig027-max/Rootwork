-- Payments + entitlement + VPC evidence. Launch-gate phase (see PAYMENTS_PLAN.md).
-- Apply after 20260617000001.
--
-- Stays parent-rooted: the parent (profiles.id, role='parent') is the buyer,
-- consent-giver, and entitlement holder. One entitlement row covers all of a
-- parent's students. Free play (no auth / student_id NULL) is never gated.
--
-- Server-write boundary: entitlements + stripe_events are written ONLY by the
-- Stripe webhook running with the service role (which bypasses RLS). Clients get
-- SELECT on their own entitlement and nothing else — a parent can read what they
-- bought but can never self-grant access.

-- 1. VPC evidence on the parent profile (the seam reserved in 20260616000002).
--    consent_at already exists; these record HOW consent was given and the
--    Stripe charge that proves it.
alter table public.profiles
  add column if not exists consent_method text
    check (consent_method is null or consent_method in ('checkbox', 'stripe'));

comment on column public.profiles.consent_method is
  'Which VPC method the parent used: ''stripe'' (card charge, primary path) or '
  '''checkbox'' (MVP honor-system; reserved for the no-card PEP path). '
  'NULL = consent not yet given.';

alter table public.profiles
  add column if not exists vpc_payment_ref text;

comment on column public.profiles.vpc_payment_ref is
  'Stripe PaymentIntent/charge id captured as COPPA VPC evidence by the '
  'checkout.session.completed webhook. NULL for checkbox-only consent. '
  'Written server-side (service role) only.';

-- 2. Entitlements: what a parent has bought. One active row per parent.
create table if not exists public.entitlements (
  id                       uuid primary key default gen_random_uuid(),
  parent_id                uuid not null unique
                             references public.profiles(id) on delete cascade,
  tier                     text not null check (tier in ('single', 'multi')),
  seats                    int  not null default 1 check (seats >= 1),
  status                   text not null default 'active'
                             check (status in ('active', 'expired', 'refunded')),
  source                   text not null default 'stripe'
                             check (source in ('stripe', 'pep', 'manual')),
  stripe_customer_id       text,
  stripe_payment_intent_id text,
  granted_at               timestamptz not null default now(),
  expires_at               timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table public.entitlements is
  'Parent-held purchase/entitlement state. Written ONLY by the Stripe webhook '
  '(service role); clients have SELECT-own and no write policy, so a parent can '
  'never self-grant. One-time annual model: expires_at = granted_at + 1 year.';

-- Reuse the set_updated_at function from 20260520000001.
drop trigger if exists entitlements_set_updated_at on public.entitlements;
create trigger entitlements_set_updated_at
  before update on public.entitlements
  for each row execute function public.set_updated_at();

alter table public.entitlements enable row level security;

-- Parent may read their own entitlement. There is intentionally NO insert/update/
-- delete policy, so the anon/authenticated roles cannot write this table at all —
-- only the service-role webhook (which bypasses RLS) does.
drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own"
  on public.entitlements for select
  using (auth.uid() = parent_id);

-- 3. Webhook idempotency log. Stripe retries deliveries; the webhook inserts the
--    event id first and skips on conflict. RLS enabled with NO policies => the
--    anon/authenticated roles have zero access; only the service role touches it.
create table if not exists public.stripe_events (
  event_id    text primary key,
  type        text not null,
  received_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
