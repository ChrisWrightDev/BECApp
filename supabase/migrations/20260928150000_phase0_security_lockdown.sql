-- =====================================================================
-- Phase 0 security lockdown (BECApp)
-- Project: janwtypmneybfzeiauzt (SHARED with blueeyedclowns.com + finance)
--
-- DO NOT apply without review. Written against live policies captured
-- 2026-09-28 (see docs/phase0-security-lockdown.md). Does NOT touch
-- finance tables, orders/order_items, blog_posts, clownfish, or the
-- public SELECT policy on hatch_batches used by the website.
-- Rollback SQL is at the bottom of this file (commented out).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- (a) work_orders: remove anon/public read; admin-only access.
--     The website writes work_orders with the service role (bypasses RLS),
--     so it is unaffected.
-- ---------------------------------------------------------------------
drop policy if exists "Enable read access for all users" on public.work_orders;

create policy "Admins can manage work orders"
  on public.work_orders
  for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- anon never needs this table (also removes it from the anon GraphQL schema)
revoke all on public.work_orders from anon;

-- ---------------------------------------------------------------------
-- (b) profiles: users may not change their own role.
--     "Users can update own profile" still lets a user edit their own
--     name etc.; this trigger rejects any change to role unless the caller
--     is an admin. Service role / SQL editor (no JWT) are not restricted.
--     SECURITY INVOKER on purpose so current_user reflects the caller.
-- ---------------------------------------------------------------------
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user in ('authenticated', 'anon')
     and not coalesce(public.is_admin(auth.uid()), false) then
    raise exception 'Only admins can change profile roles'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_profile_role_change() from public, anon, authenticated;

drop trigger if exists prevent_profile_role_change on public.profiles;
create trigger prevent_profile_role_change
  before update of role on public.profiles
  for each row
  execute function public.prevent_profile_role_change();

-- New sign-ups always start as 'worker'. Previously handle_new_user copied
-- raw_user_meta_data->>'role', so anyone signing up with
-- options.data.role = 'admin' became an admin. Admins promote users in-app.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, firstname, lastname, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'firstname', ''),
    coalesce(new.raw_user_meta_data->>'lastname', ''),
    'worker'::public.user_role
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- (c) hatch_batches: writes admin-only. SELECT policies unchanged:
--     "Public can read visible hatch batches" (anon, authenticated) and
--     "Authenticated users can read all hatch batches" stay as-is.
--     The website reads via the service role (bypasses RLS) anyway.
-- ---------------------------------------------------------------------
drop policy if exists "Authenticated users can insert hatch batches" on public.hatch_batches;
drop policy if exists "Authenticated users can update hatch batches" on public.hatch_batches;
drop policy if exists "Authenticated users can delete hatch batches" on public.hatch_batches;

create policy "Admins can insert hatch batches"
  on public.hatch_batches
  for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

create policy "Admins can update hatch batches"
  on public.hatch_batches
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins can delete hatch batches"
  on public.hatch_batches
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- (d) Function hardening
-- ---------------------------------------------------------------------
-- is_admin: callable by authenticated (RLS policies need it), not anon.
-- EXECUTE was granted to PUBLIC, so revoke from PUBLIC as well as anon.
revoke execute on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated, service_role;

-- handle_new_user is only a trigger on auth.users; nobody needs to call it
-- via /rest/v1/rpc. Trigger firing does not check EXECUTE privilege.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Pin search_path on functions flagged by the advisor
-- (handle_new_user is pinned above via create or replace).
alter function public.calculate_session_duration() set search_path = '';
alter function public.update_updated_at_column() set search_path = '';

commit;

-- =====================================================================
-- ROLLBACK (run manually only if needed; restores 2026-09-28 state)
-- =====================================================================
-- begin;
--
-- -- (a) work_orders
-- drop policy if exists "Admins can manage work orders" on public.work_orders;
-- create policy "Enable read access for all users"
--   on public.work_orders for select to public using (true);
-- grant all on public.work_orders to anon;
--
-- -- (b) profiles / handle_new_user
-- drop trigger if exists prevent_profile_role_change on public.profiles;
-- drop function if exists public.prevent_profile_role_change();
-- create or replace function public.handle_new_user()
-- returns trigger language plpgsql security definer as $$
-- begin
--   insert into public.profiles (id, firstname, lastname, role)
--   values (
--     new.id,
--     coalesce(new.raw_user_meta_data->>'firstname', ''),
--     coalesce(new.raw_user_meta_data->>'lastname', ''),
--     coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'worker')
--   );
--   return new;
-- end; $$;
-- alter function public.handle_new_user() reset search_path;
--
-- -- (c) hatch_batches
-- drop policy if exists "Admins can insert hatch batches" on public.hatch_batches;
-- drop policy if exists "Admins can update hatch batches" on public.hatch_batches;
-- drop policy if exists "Admins can delete hatch batches" on public.hatch_batches;
-- create policy "Authenticated users can insert hatch batches"
--   on public.hatch_batches for insert to authenticated
--   with check ((select auth.uid()) is not null);
-- create policy "Authenticated users can update hatch batches"
--   on public.hatch_batches for update to authenticated
--   using ((select auth.uid()) is not null)
--   with check ((select auth.uid()) is not null);
-- create policy "Authenticated users can delete hatch batches"
--   on public.hatch_batches for delete to authenticated
--   using ((select auth.uid()) is not null);
--
-- -- (d) functions
-- grant execute on function public.is_admin(uuid) to public, anon;
-- grant execute on function public.handle_new_user() to public, anon, authenticated;
-- alter function public.calculate_session_duration() reset search_path;
-- alter function public.update_updated_at_column() reset search_path;
--
-- commit;
