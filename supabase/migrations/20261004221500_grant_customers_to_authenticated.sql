-- Customers admin grants (BECApp)
-- Project: janwtypmneybfzeiauzt (SHARED with blueeyedclowns.com)
--
-- DO NOT apply without review. Not applied by this change.
--
-- public.customers already exists, with RLS:
--   "Admins can select customers"  (SELECT, is_admin(auth.uid()))
--   "Admins can update customers"  (UPDATE, is_admin(auth.uid()))
-- The authenticated role has no table privileges, so the Data API
-- returns permission denied even for admins. This grants SELECT and
-- UPDATE only. No insert, no delete, no anon access.
-- Policies are not recreated.
-- =====================================================================

begin;

grant select, update on table public.customers to authenticated;

commit;

-- =====================================================================
-- ROLLBACK (run manually only if needed)
-- =====================================================================
-- begin;
-- revoke select, update on table public.customers from authenticated;
-- commit;
