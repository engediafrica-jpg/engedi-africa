-- Equipment providers can now be hired the same way artisans/professionals/
-- service providers are: a project owner requests a booking against their
-- profile. This just widens the role allow-list on the existing insert
-- policy — everything else about bookings (select/update policies, status
-- checks, the moddatetime trigger) is already role-agnostic.
--
-- Not run automatically — review against your actual bookings RLS in the
-- Supabase SQL editor, same as 0001-0005.

drop policy if exists "bookings_insert_owner" on bookings;
create policy "bookings_insert_owner" on bookings
  for insert with check (
    auth.uid() = project_owner_id
    and exists (
      select 1 from profiles
      where id = provider_id
        and role in ('artisan', 'professional', 'service_provider', 'equipment_provider')
    )
  );
