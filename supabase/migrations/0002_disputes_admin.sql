-- Admin dispute resolution: RLS so admins can actually see/act on disputes and
-- bookings, resolution tracking columns on `disputes`, and the extra
-- status values the admin panel's resolve actions need.
--
-- Same caveat as 0001_bookings.sql: not run automatically, review against your
-- actual schema/policies in the Supabase SQL editor before running. In
-- particular the `orders`/`disputes` ALTER + policy statements are best-effort
-- since this repo has no copy of their live schema or existing RLS policies —
-- if a statement conflicts with something that already exists, drop/adjust it.

-- --- Admin bypass RLS -------------------------------------------------------
-- profiles.is_admin already gates app/admin/page.jsx client-side; these
-- policies give admins the same reach at the database level.

create policy "bookings_admin_all" on bookings
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "disputes_admin_all" on disputes
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- If `orders` doesn't already have an admin bypass policy, add one so the
-- admin disputes tab can update order escrow state too:
create policy "orders_admin_all" on orders
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- --- Dispute resolution tracking --------------------------------------------
alter table disputes add column if not exists resolution text;
alter table disputes add column if not exists resolved_by uuid references profiles(id);
alter table disputes add column if not exists resolved_at timestamptz;

-- Disputes only had 'open' in the app code so far; admin resolution needs
-- a second state. Drop first in case a CHECK already exists with a
-- different name/value set for this column.
alter table disputes drop constraint if exists disputes_status_check;
alter table disputes add constraint disputes_status_check
  check (status in ('open', 'resolved'));

-- --- Extra status values for admin actions ----------------------------------
-- Bookings: allow an owner to cancel a still-pending request, and allow
-- admin's "refund client" dispute action.
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in (
    'requested', 'accepted', 'declined', 'countered', 'cancelled',
    'paid', 'completed_by_provider', 'completed', 'disputed'
  ));

alter table bookings drop constraint if exists bookings_payment_status_check;
alter table bookings add constraint bookings_payment_status_check
  check (payment_status in ('pending', 'paid', 'released', 'refunded'));

-- Orders: same 'refunded' addition for the admin refund action. Constraint
-- name guessed as Postgres's default auto-generated name for an inline
-- CHECK on payment_status — verify this matches your actual `orders` table
-- (e.g. via the Supabase dashboard's table editor) before running.
alter table orders drop constraint if exists orders_payment_status_check;
alter table orders add constraint orders_payment_status_check
  check (payment_status in ('pending', 'paid', 'released', 'refunded'));
