-- Bookings feature: hiring a person (artisan / professional / service provider) for a job,
-- as opposed to `orders` which is buying physical materials from a supplier.
--
-- This file is NOT run automatically — there is no migration tooling wired into this repo
-- (schema lives directly in the Supabase project). Review it against your actual `profiles`,
-- `disputes`, `reviews`, and `notifications` tables, then run it in the Supabase SQL editor.
-- Column names/types for the tables it touches were inferred from the app code
-- (app/orders/page.jsx, app/artisans/[id]/page.jsx, etc.) since no schema file exists here —
-- double check before running, especially the ALTER TABLE statements at the bottom.

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),

  project_owner_id uuid not null references profiles(id),
  provider_id uuid not null references profiles(id),

  job_title text not null,
  job_description text,
  location text,
  preferred_date date,
  budget numeric,

  status text not null default 'requested'
    check (status in (
      'requested', 'accepted', 'declined', 'countered',
      'paid', 'completed_by_provider', 'completed', 'disputed'
    )),

  -- set when the provider accepts, or when the owner accepts a counter-offer;
  -- this is the amount actually charged via Paystack
  quoted_price numeric,
  decline_reason text,

  -- provider's counter-offer, cleared once accepted/declined
  counter_price numeric,
  counter_date date,
  counter_note text,

  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'released')),
  payment_reference text,
  commission_rate numeric default 0.12,
  commission_amount numeric,
  payout_amount numeric,
  payout_reference text,
  escrow_released boolean not null default false,
  auto_confirm_at timestamptz,
  confirmed_at timestamptz,

  dispute_raised boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_project_owner_id_idx on bookings(project_owner_id);
create index if not exists bookings_provider_id_idx on bookings(provider_id);

alter table bookings enable row level security;

-- Owner and provider can each see their side of the booking.
create policy "bookings_select_participants" on bookings
  for select using (auth.uid() = project_owner_id or auth.uid() = provider_id);

-- Only a project owner can create a booking request, and only against a hireable role.
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
create policy "bookings_update_participants" on bookings
  for update using (auth.uid() = project_owner_id or auth.uid() = provider_id);

create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function moddatetime(updated_at);
-- If you don't already have the `moddatetime` extension enabled for `orders`,
-- either enable it (`create extension if not exists moddatetime;`) or drop this
-- trigger and set updated_at from the app instead, matching how `orders` does it.

-- Reviews should be tied to a specific completed booking (or order) rather than
-- being one-per-person-ever. Nullable so existing rows / order-based reviews are unaffected.
alter table reviews add column if not exists booking_id uuid references bookings(id);

-- Disputes need to reference either an order or a booking.
alter table disputes add column if not exists booking_id uuid references bookings(id);
alter table disputes alter column order_id drop not null;
alter table disputes add constraint disputes_order_or_booking_chk
  check (
    (order_id is not null and booking_id is null) or
    (order_id is null and booking_id is not null)
  );
