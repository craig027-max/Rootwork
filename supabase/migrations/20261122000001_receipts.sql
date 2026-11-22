-- Checkout receipts. Apply after 20260617000002.
--
-- The webhook (service role) inserts one row per paid Checkout session.
-- A parent may read their own row and may set student_name only.
-- There is no mailing address and no EIN on this table.

create table if not exists public.receipts (
  id                       uuid primary key default gen_random_uuid(),
  parent_id                uuid not null
                             references public.profiles(id) on delete cascade,
  checkout_session_id      text not null unique,
  receipt_number           text not null unique
                             check (receipt_number ~ '^WW-[A-Z]{4}-[A-Z]{4}$'),
  stripe_payment_intent_id text,
  purchased_at             timestamptz not null,
  term_start               date not null,
  item                     text not null,
  base_cents               int not null check (base_cents >= 0),
  discount_cents           int not null check (discount_cents >= 0),
  tax_cents                int not null check (tax_cents >= 0),
  fee_cents                int not null check (fee_cents >= 0),
  total_paid_cents         int not null check (total_paid_cents >= 0),
  card_brand               text not null,
  card_last4               text not null check (card_last4 ~ '^[0-9]{4}$'),
  student_name             text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint receipts_discount_within_base check (discount_cents <= base_cents),
  constraint receipts_total_matches check (
    total_paid_cents = base_cents - discount_cents + tax_cents + fee_cents
  ),
  constraint receipts_student_name_len check (
    student_name is null or char_length(student_name) between 1 and 40
  )
);

comment on table public.receipts is
  'Parent receipt for one paid Checkout session. Written only by the Stripe '
  'webhook (service role). Parents may SELECT their row and UPDATE student_name. '
  'Do not store a mailing address or an EIN.';

create index if not exists receipts_parent_purchased_idx
  on public.receipts (parent_id, purchased_at desc);

drop trigger if exists receipts_set_updated_at on public.receipts;
create trigger receipts_set_updated_at
  before update on public.receipts
  for each row execute function public.set_updated_at();

-- A parent update that touches money, the card, or the receipt number is refused.
create or replace function public.receipts_guard_parent_update()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is distinct from old.parent_id
     or new.checkout_session_id is distinct from old.checkout_session_id
     or new.receipt_number is distinct from old.receipt_number
     or new.stripe_payment_intent_id is distinct from old.stripe_payment_intent_id
     or new.purchased_at is distinct from old.purchased_at
     or new.term_start is distinct from old.term_start
     or new.item is distinct from old.item
     or new.base_cents is distinct from old.base_cents
     or new.discount_cents is distinct from old.discount_cents
     or new.tax_cents is distinct from old.tax_cents
     or new.fee_cents is distinct from old.fee_cents
     or new.total_paid_cents is distinct from old.total_paid_cents
     or new.card_brand is distinct from old.card_brand
     or new.card_last4 is distinct from old.card_last4
     or new.created_at is distinct from old.created_at
  then
    raise exception 'parents may only set the student name on a receipt';
  end if;
  if new.student_name is not null and char_length(btrim(new.student_name)) = 0 then
    new.student_name = null;
  end if;
  if new.student_name is not null and char_length(new.student_name) > 40 then
    raise exception 'student name is too long';
  end if;
  return new;
end;
$$;

drop trigger if exists receipts_guard_parent_update on public.receipts;
create trigger receipts_guard_parent_update
  before update on public.receipts
  for each row execute function public.receipts_guard_parent_update();

alter table public.receipts enable row level security;

drop policy if exists "receipts_select_own" on public.receipts;
create policy "receipts_select_own"
  on public.receipts for select
  using (auth.uid() = parent_id);

drop policy if exists "receipts_update_own" on public.receipts;
create policy "receipts_update_own"
  on public.receipts for update
  using (auth.uid() = parent_id)
  with check (auth.uid() = parent_id);

-- No insert or delete policy: authenticated clients cannot add or remove a receipt.
revoke all on table public.receipts from public, anon, authenticated;
grant select on table public.receipts to authenticated;
grant update (student_name, updated_at) on table public.receipts to authenticated;
