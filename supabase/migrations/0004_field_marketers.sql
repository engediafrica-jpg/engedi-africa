-- Field marketer program: admin-provisioned accounts (role='field_marketer')
-- that get a unique referral code and a link like
-- engediafrica.com/signup?ref=FM001. Signups via that link are attributed on
-- the referred user's own profile row. Payment is a manual monthly transport
-- allowance + stipend an admin logs per marketer per month via
-- `marketer_payments` — NOT a computed commission off referred users'
-- bookings/orders activity.
--
-- Not run automatically — review against your actual `profiles` schema/RLS
-- in the Supabase SQL editor before running, same as 0001-0003.

-- --- Referral identity on profiles -------------------------------------------
alter table profiles add column if not exists referral_code text;
alter table profiles add column if not exists referred_by_marketer_id uuid references profiles(id);

-- Only field_marketer accounts should ever have a referral_code; enforce
-- uniqueness so FM001-style codes can't collide.
create unique index if not exists profiles_referral_code_idx on profiles (referral_code) where referral_code is not null;

-- --- Marketer payment ledger (manual monthly allowance/stipend) -------------
create table if not exists marketer_payments (
  id uuid primary key default gen_random_uuid()
);

alter table marketer_payments add column if not exists marketer_id uuid references profiles(id) not null;
alter table marketer_payments add column if not exists month date not null; -- first-of-month, e.g. 2026-07-01
alter table marketer_payments add column if not exists amount numeric not null;
alter table marketer_payments add column if not exists note text;
alter table marketer_payments add column if not exists created_by uuid references profiles(id);
alter table marketer_payments add column if not exists created_at timestamptz default now();

create unique index if not exists marketer_payments_marketer_month_idx on marketer_payments (marketer_id, month);

-- --- RLS: same admin-bypass shape as 0002_disputes_admin.sql ----------------
alter table marketer_payments enable row level security;

create policy "marketer_payments_admin_all" on marketer_payments
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "marketer_payments_select_own" on marketer_payments
  for select using (marketer_id = auth.uid());

-- Worth checking: this assumes `profiles` already has a broad-enough SELECT
-- policy for the referral-code lookup at signup (app/signup/page.jsx looking
-- up a marketer's profiles.id by referral_code) and for an authenticated
-- user to update their own referred_by_marketer_id column — verify against
-- your actual RLS policies (not visible from this repo) before relying on it.
