-- =====================================================================
-- Phase 1 messaging (BECApp)
-- Project: janwtypmneybfzeiauzt (SHARED with blueeyedclowns.com + finance)
--
-- DO NOT apply without review. Adds a messages table for mike/chris to
-- communicate with an ops agent. Does NOT touch finance tables, orders,
-- blog_posts, clownfish, hatch_batches, or any existing objects.
-- Rollback SQL is at the bottom of this file (commented out).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- (a) messages table
-- ---------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread text not null default 'ops',
  sender_role text not null check (sender_role in ('mike','chris','agent','system')),
  sender_id uuid null references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  attachments jsonb not null default '[]'::jsonb,
  reply_to uuid null references public.messages(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  agent_processed_at timestamptz,
  agent_status text check (agent_status in ('pending','processing','replied','error','none'))
);

-- Index for efficient retrieval by thread and created_at
create index messages_thread_created_at_idx on public.messages (thread, created_at desc);

-- Partial index for backstop polling: agent_status in (pending, processing) and created_at
create index messages_agent_status_created_at_idx 
  on public.messages (agent_status, created_at)
  where agent_status in ('pending','processing');

-- ---------------------------------------------------------------------
-- (b) RLS policies
-- ---------------------------------------------------------------------
alter table public.messages enable row level security;
alter table public.messages force row level security;

-- Revoke default permissions from anon and authenticated
revoke all on public.messages from anon, authenticated;

-- authenticated: SELECT all messages (or restrict to thread='ops' / to admins)
-- Decision: allow all authenticated users to read all messages for simplicity.
-- Both current users (mike, chris) are admins. If needed, could restrict to
-- `where thread = 'ops'` or `where public.is_admin(auth.uid())`.
grant select on public.messages to authenticated;

create policy "Authenticated users can read all messages"
  on public.messages
  for select
  to authenticated
  using (true);

-- authenticated: INSERT with column grant (thread, sender_role, sender_id, body, attachments, reply_to)
-- Client cannot forge agent_status, read_at, agent_processed_at, or created_at
grant insert (thread, sender_role, sender_id, body, attachments, reply_to) on public.messages to authenticated;

create policy "Users can insert messages as themselves"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and sender_role in ('mike','chris')
  );

-- authenticated: UPDATE read_at only
grant update (read_at) on public.messages to authenticated;

create policy "Users can mark messages as read"
  on public.messages
  for update
  to authenticated
  using (true)
  with check (true);

-- No delete grant or policy. anon gets nothing.

-- ---------------------------------------------------------------------
-- (c) Realtime publication
-- ---------------------------------------------------------------------
-- Guard against re-applying the migration if the publication already contains the table
do $$
begin
  if not exists (
    select 1 
    from pg_publication_tables 
    where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- (d) Trigger function: notify agent via pg_net (fire-and-forget)
-- ---------------------------------------------------------------------
create or replace function public.messages_notify_agent_fn()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_net_available boolean;
begin
  -- Exit early if pg_net is not installed (avoid compilation failure)
  -- Check if net.http_post exists as a function
  if to_regproc('net.http_post') is null then
    raise warning 'pg_net extension not installed; skipping agent notification for message %', new.id;
    return new;
  end if;

  -- Retrieve Vault secrets
  begin
    select decrypted_secret into v_url
      from vault.decrypted_secrets
      where name = 'on_message_url';
    
    select decrypted_secret into v_secret
      from vault.decrypted_secrets
      where name = 'on_message_internal_secret';
  exception
    when others then
      raise warning 'Failed to retrieve Vault secrets for message %: %', new.id, sqlerrm;
      return new;
  end;

  -- Exit if secrets are missing
  if v_url is null or v_secret is null then
    raise warning 'Vault secrets missing; skipping agent notification for message %', new.id;
    return new;
  end if;

  -- Call net.http_post via dynamic SQL to avoid dependency on pg_net extension at compile time
  begin
    execute format(
      'select net.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 5000)'
    ) using
      v_url,
      jsonb_build_object(
        'Content-Type', 'application/json',
        'X-BEC-Internal-Secret', v_secret
      ),
      jsonb_build_object('message_id', new.id);
  exception
    when others then
      -- Log but do not fail the insert
      raise warning 'Failed to call net.http_post for message %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

-- Revoke execute from public, anon, authenticated (trigger functions don't require EXECUTE privilege)
revoke execute on function public.messages_notify_agent_fn() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- (e) AFTER INSERT trigger: notify agent for mike/chris messages
-- ---------------------------------------------------------------------
drop trigger if exists messages_notify_agent on public.messages;

create trigger messages_notify_agent
  after insert on public.messages
  for each row
  when (new.sender_role in ('mike','chris'))
  execute function public.messages_notify_agent_fn();

-- ---------------------------------------------------------------------
-- (f) BEFORE INSERT trigger: set agent_status when null
-- ---------------------------------------------------------------------
create or replace function public.messages_set_agent_status_fn()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.agent_status is null then
    if new.sender_role in ('mike','chris') then
      new.agent_status := 'pending';
    else
      new.agent_status := 'none';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_set_agent_status on public.messages;

create trigger messages_set_agent_status
  before insert on public.messages
  for each row
  execute function public.messages_set_agent_status_fn();

commit;

-- =====================================================================
-- ROLLBACK (run manually only if needed)
-- =====================================================================
-- begin;
--
-- drop trigger if exists messages_notify_agent on public.messages;
-- drop trigger if exists messages_set_agent_status on public.messages;
-- drop function if exists public.messages_notify_agent_fn();
-- drop function if exists public.messages_set_agent_status_fn();
--
-- -- Remove table from realtime publication
-- do $$
-- begin
--   if exists (
--     select 1 
--     from pg_publication_tables 
--     where pubname = 'supabase_realtime' 
--       and schemaname = 'public' 
--       and tablename = 'messages'
--   ) then
--     alter publication supabase_realtime drop table public.messages;
--   end if;
-- end;
-- $$;
--
-- drop table if exists public.messages cascade;
--
-- commit;
