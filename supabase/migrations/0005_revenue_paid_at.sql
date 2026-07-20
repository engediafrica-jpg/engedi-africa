-- Revenue reporting needs a stable "when did this transaction generate
-- commission" timestamp. created_at is set at request time (before payment),
-- updated_at is trigger-maintained on every subsequent status change, and
-- confirmed_at is set later at completion/release — none of these reliably
-- mark "paid this month".
--
-- Not run automatically — review against your actual bookings/orders schema
-- in the Supabase SQL editor, same as 0001-0004. Historical rows will have
-- paid_at = null; app code falls back to created_at for those.

alter table bookings add column if not exists paid_at timestamptz;
alter table orders add column if not exists paid_at timestamptz;
