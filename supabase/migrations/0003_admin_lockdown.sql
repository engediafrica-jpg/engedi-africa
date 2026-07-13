-- Lock admin access down to one account, and stop any authenticated user from
-- granting themselves (or anyone else) admin via a direct table update —
-- nothing in the app code sets is_admin, so this was almost certainly either
-- a `default true` on the column or an overly-broad "users can update their
-- own profile" RLS policy with no column restriction. This migration fixes
-- both the data and the hole, whichever it was.
--
-- As with the earlier migrations: run in the Supabase SQL editor, review
-- first — I can't see your live schema/policies from this repo.

-- --- Fix existing data -------------------------------------------------------
update profiles set is_admin = (lower(email) = 'onah@engediafrica.com');

-- --- Stop new signups from ever defaulting to admin -------------------------
alter table profiles alter column is_admin set default false;

-- --- Stop non-admins from setting is_admin on any row, including their own -
-- Only blocks writes made through a normal user JWT (auth.uid() present).
-- Service-role scripts and the Supabase SQL editor (auth.uid() is null in
-- both) are unaffected, so you can still promote a second admin later by
-- running an UPDATE directly.
create or replace function prevent_self_admin_escalation()
returns trigger as $$
begin
  if new.is_admin is distinct from old.is_admin then
    if auth.uid() is not null and not exists (
      select 1 from profiles where id = auth.uid() and is_admin = true
    ) then
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists profiles_prevent_admin_escalation on profiles;
create trigger profiles_prevent_admin_escalation
  before update on profiles
  for each row execute function prevent_self_admin_escalation();

-- --- Worth knowing ------------------------------------------------------------
-- This only locks down is_admin. If the same "update your own profile, any
-- column" RLS policy also covers is_verified/verification_status, a user can
-- self-approve their own verification the same way admin was self-grantable.
-- Same fix shape would apply (either a similar trigger, or restrict the
-- policy's WITH CHECK to a safe column allowlist) — say the word and I'll
-- add it.
