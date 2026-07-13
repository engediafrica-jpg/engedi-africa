-- Bookings feature: hiring a person (artisan / professional / service provider) for a job,
-- as opposed to `orders` which is buying physical materials from a supplier.
--
-- This file is NOT run automatically — there is no migration tooling wired into this repo
-- (schema lives directly in the Supabase project). Review it against your actual `profiles`,
-- `disputes`, `reviews`, and `notifications` tables, then run it in the Supabase SQL editor.
--
-- Written additively/idempotently on purpose: a `bookings` table already existed in this
-- project with a different shape than assumed here, so `create table if not exists` silently
-- no-op'd against it and every statement after failed. Using `add column if not exists` per
-- column instead means this runs safely whether `bookings` doesn't exist yet, already exists
-- empty, or already exists with some of these columns present.

create table if not exists bookings (
  id uuid primary key default gen_random_uuid()
);

alter table bookings add column if not exists project_owner_id uuid references profiles(id);
alter table bookings add column if not exists provider_id uuid references profiles(id);
alter table bookings add column if not exists job_title text;
alter table bookings add column if not exists job_description text;
alter table bookings add column if not exists location text;
alter table bookings add column if not exists preferred_date date;
alter table bookings add column if not exists budget numeric;
alter table bookings add column if not exists status text default 'requested';
alter table bookings add column if not exists quoted_price numeric;
alter table bookings add column if not exists decline_reason text;
alter table bookings add column if not exists counter_price numeric;
alter table bookings add column if not exists counter_date date;
alter table bookings add column if not exists counter_note text;
alter table bookings add column if not exists payment_status text default 'pending';
alter table bookings add column if not exists payment_reference text;
alter table bookings add column if not exists commission_rate numeric default 0.12;
alter table bookings add column if not exists commission_amount numeric;
alter table bookings add column if not exists payout_amount numeric;
alter table bookings add column if not exists payout_reference text;
alter table bookings add column if not exists escrow_released boolean default false;
alter table bookings add column if not exists auto_confirm_at timestamptz;
alter table bookings add column if not exists confirmed_at timestamptz;
alter table bookings add column if not exists dispute_raised boolean default false;
alter table bookings add column if not exists created_at timestamptz default now();
alter table bookings add column if not exists updated_at timestamptz default now();

-- NOT VALID so these don't choke on any pre-existing rows in whatever
-- `bookings` table was already there — they still apply to every new
-- insert/update going forward. Includes 'cancelled'/'refunded' up front
-- (originally added later in 0002) so there's one source of truth.
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in (
    'requested', 'accepted', 'declined', 'countered', 'cancelled',
    'paid', 'completed_by_provider', 'completed', 'disputed'
  )) not valid;

alter table bookings drop constraint if exists bookings_payment_status_check;
alter table bookings add constraint bookings_payment_status_check
  check (payment_status in ('pending', 'paid', 'released', 'refunded')) not valid;

create index if not exists bookings_project_owner_id_idx on bookings(project_owner_id);
create index if not exists bookings_provider_id_idx on bookings(provider_id);

alter table bookings enable row level security;

-- Owner and provider can each see their side of the booking.
drop policy if exists "bookings_select_participants" on bookings;
create policy "bookings_select_participants" on bookings
  for select using (auth.uid() = project_owner_id or auth.uid() = provider_id);

-- Only a project owner can create a booking request, and only against a hireable role.
drop policy if exists "bookings_insert_owner" on bookings;
create policy "bookings_insert_owner" on bookings
  for insert with check (
    auth.uid() = project_owner_id
    and exists (
      select 1 from profiles
      where id = provider_id
        and role in ('artisan', 'professional', 'service_provider')
    )
  );

-- Both sides update the row at different points in the flow (accept/decline/counter,
-- pay, mark done, confirm, dispute) — field-level restriction is enforced in the app,
-- same pattern the existing `orders` table uses.
drop policy if exists "bookings_update_participants" on bookings;
create policy "bookings_update_participants" on bookings
  for update using (auth.uid() = project_owner_id or auth.uid() = provider_id);

drop trigger if exists bookings_set_updated_at on bookings;
create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function moddatetime(updated_at);
-- If you don't already have the `moddatetime` extension enabled, run
-- `create extension if not exists moddatetime;` first, or drop this
-- trigger and set updated_at from the app instead, matching how `orders` does it.

-- Reviews should be tied to a specific completed booking (or order) rather than
-- being one-per-person-ever. Nullable so existing rows / order-based reviews are unaffected.
alter table reviews add column if not exists booking_id uuid references bookings(id);

-- Disputes need to reference either an order or a booking.
alter table disputes add column if not exists booking_id uuid references bookings(id);
alter table disputes alter column order_id drop not null;
alter table disputes drop constraint if exists disputes_order_or_booking_chk;
alter table disputes add constraint disputes_order_or_booking_chk
  check (
    (order_id is not null and booking_id is null) or
    (order_id is null and booking_id is not null)
  ) not valid;
