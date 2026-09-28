# Phase 0 security lockdown

Migration: `supabase/migrations/20260928150000_phase0_security_lockdown.sql`

**Status: not applied.** Review, then apply by hand in the Supabase SQL editor
(or `supabase db push`). The database (`janwtypmneybfzeiauzt`) is shared with
blueeyedclowns.com and the finance tables. This migration touches none of the
finance tables, `orders`/`order_items`, `blog_posts` or `clownfish`.

## What changes

| Area | Before (live, 2026-09-28) | After |
|---|---|---|
| `work_orders` | `"Enable read access for all users"`: SELECT to public using `true`. Anyone with the anon key can read customer names, emails and addresses. | That policy is dropped. New `"Admins can manage work orders"` policy for authenticated admins only (`is_admin(auth.uid())`). All anon table grants revoked. The website inserts with the service role, so it keeps working. |
| `profiles.role` | `"Users can update own profile"` lets any user set their own `role = 'admin'`. | New BEFORE UPDATE OF role trigger `prevent_profile_role_change` rejects any role change unless the caller is an admin. Service role and SQL editor are not affected. Users can still edit their own name. |
| `handle_new_user` | Copies `raw_user_meta_data->>'role'`, so a public sign-up with `data: { role: 'admin' }` becomes an admin. | New users always start as `worker`. Admins promote them on /admin/users. `search_path` pinned to `''`. |
| `hatch_batches` writes | Any authenticated user can INSERT/UPDATE/DELETE. | Admins only (`is_admin(auth.uid())`). |
| `hatch_batches` reads | `"Public can read visible hatch batches"` (anon + authenticated, `public_visible = true AND (published_at IS NULL OR published_at <= now())`) and `"Authenticated users can read all hatch batches"`. | **Unchanged.** The website (`server/utils/hatchBatchesCatalog.js`) reads with the service role and `.eq('public_visible', true)`, so RLS doesn't affect it either way. |
| `is_admin(uuid)` | EXECUTE granted to PUBLIC/anon. | EXECUTE revoked from PUBLIC and anon. Kept for authenticated and service_role, which RLS needs. |
| `handle_new_user()` | Can be called via `/rest/v1/rpc` by anon and authenticated. | EXECUTE revoked from PUBLIC, anon and authenticated. The trigger still fires. |
| `calculate_session_duration`, `update_updated_at_column` | Mutable search_path (advisor warning). | `search_path = ''`. |

Not in this PR (later phases or separate work): role-based RLS on tasks,
tanks, projects etc. (any signed-in user can still write these), and GraphQL
exposure of the other tables.

## Manual steps (Supabase dashboard)

- [ ] **Turn off public sign-ups:** Authentication → Sign In / Providers → turn off "Allow new users to sign up".
      Observed 2026-09-28 at `GET /auth/v1/settings`: `disable_signup: false`
      (sign-ups are **on**; email confirmation is required, `mailer_autoconfirm: false`).
      After this, invite Chris and Mike from Authentication → Users → Invite.
- [ ] **Turn on leaked-password protection:** Authentication → Providers → Email / Password security.
- [ ] Take a backup or snapshot before you apply the migration.

## Test plan (after applying)

1. **A worker can't promote themselves:** sign in as a worker and run
   `supabase.from('profiles').update({ role: 'admin' }).eq('id', <own id>)`.
   It should fail with "Only admins can change profile roles".
   Updating their own `firstname` should still work.
2. **An admin can still change roles:** on /admin/users, change a worker's role. It should succeed.
3. **anon can't read work_orders:**
   `curl "$URL/rest/v1/work_orders?select=*" -H "apikey: $ANON"` should return an error or `[]`.
4. **A worker can't write hatch_batches:** an insert, update or delete as a worker should affect 0 rows or return an RLS error.
   The same actions as an admin should succeed.
5. **Website still works:** blueeyedclowns.com hatch journal and hatch detail pages load.
   `curl "$URL/rest/v1/hatch_batches?select=id&public_visible=eq.true" -H "apikey: $ANON"` still returns the public rows.
6. **Sign-up gives worker:** if sign-ups are still on, a test sign-up with
   `options.data.role = 'admin'` should produce a profile with role `worker`. Delete the test user afterward.
7. **Advisor:** Database → Advisors → Security. The anon SECURITY DEFINER warning and the mutable-search_path warnings should be gone.
8. **App smoke test:** log in, see tasks, complete a task, log out (user_sessions logout is still recorded).

## Rollback

The migration file ends with commented rollback SQL that restores the
2026-09-28 policies, grants and function definitions.
