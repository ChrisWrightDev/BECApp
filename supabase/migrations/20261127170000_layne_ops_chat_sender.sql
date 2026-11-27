-- =====================================================================
-- Let Layne Wright send in Ops Chat (BECApp)
-- Project: janwtypmneybfzeiauzt
--
-- Matches the live database: sender_role may be 'layne', and
-- laynewright010@gmail.com may insert messages as herself with
-- sender_role = 'layne'.
--
-- Idempotent. Does NOT change the agent notify trigger (still
-- mike/chris only) and does NOT touch storage buckets.
--
-- IMPORTANT: Keep the email-to-sender_role mapping in sync with
-- app/utils/chatConfig.js
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- (a) allow sender_role = 'layne'
-- ---------------------------------------------------------------------
alter table public.messages drop constraint if exists messages_sender_role_check;

alter table public.messages
  add constraint messages_sender_role_check
  check (sender_role in ('mike', 'chris', 'agent', 'system', 'layne'));

-- ---------------------------------------------------------------------
-- (b) insert policy: Layne posts as herself, others stay view-only
-- ---------------------------------------------------------------------
drop policy if exists "Users can insert messages as themselves" on public.messages;

create policy "Users can insert messages as themselves"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and sender_role in ('mike', 'chris', 'layne')
    and sender_role = case lower(auth.jwt()->>'email')
      when 'chrismwright@yahoo.com' then 'chris'
      when 'oceanviews@cox.net' then 'mike'
      when 'laynewright010@gmail.com' then 'layne'
      else null
    end
  );

commit;
