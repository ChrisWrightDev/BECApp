-- =====================================================================
-- Important Reminders (BECApp)
-- Project: janwtypmneybfzeiauzt
--
-- DO NOT apply without review. Creates public.important_reminders for
-- one-off staff tasks (e.g. Mike), including items created from Ops Chat.
-- Does NOT touch finance tables, orders, blog_posts, clownfish, or
-- hatch_batches. Rollback SQL is at the bottom (commented out).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- (a) important_reminders
-- ---------------------------------------------------------------------
create table public.important_reminders (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 4000),
  details text,
  due_date date,
  assigned_to uuid null references public.profiles(id) on delete set null,
  source_message_id uuid null references public.messages(id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users(id),
  completed_at timestamptz,
  completed_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.important_reminders is 'One-off important staff tasks (not recurring checklists)';
comment on column public.important_reminders.title is 'Short task title; chat-created reminders start as the message body';
comment on column public.important_reminders.details is 'Optional extra context';
comment on column public.important_reminders.due_date is 'Optional due date (America/Chicago calendar day)';
comment on column public.important_reminders.assigned_to is 'Null means all staff; otherwise a profiles.id';
comment on column public.important_reminders.source_message_id is 'Ops Chat message this reminder was created from, if any';
comment on column public.important_reminders.completed_at is 'Null while open; set when checked off';

create index important_reminders_open_due_idx
  on public.important_reminders (due_date asc nulls last, created_at asc)
  where completed_at is null;

create index important_reminders_completed_at_idx
  on public.important_reminders (completed_at desc)
  where completed_at is not null;

create index important_reminders_source_message_id_idx
  on public.important_reminders (source_message_id)
  where source_message_id is not null;

create trigger update_important_reminders_updated_at
  before update on public.important_reminders
  for each row
  execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- (b) RLS
-- ---------------------------------------------------------------------
alter table public.important_reminders enable row level security;
alter table public.important_reminders force row level security;

revoke all on public.important_reminders from anon, authenticated;

grant select on public.important_reminders to authenticated;
grant insert (title, details, due_date, assigned_to, source_message_id, created_by)
  on public.important_reminders to authenticated;
grant update (title, details, due_date, assigned_to, source_message_id, completed_at, completed_by)
  on public.important_reminders to authenticated;
grant delete on public.important_reminders to authenticated;

create policy "Authenticated staff can read reminders"
  on public.important_reminders
  for select
  to authenticated
  using (true);

create policy "Authenticated staff can insert reminders"
  on public.important_reminders
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "Authenticated staff can update reminders"
  on public.important_reminders
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Admins can delete reminders"
  on public.important_reminders
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- (c) Realtime (same publication as checklists / chat)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'important_reminders'
  ) then
    alter publication supabase_realtime add table public.important_reminders;
  end if;
end;
$$;

commit;

-- =====================================================================
-- ROLLBACK (run manually only if needed)
-- =====================================================================
-- begin;
--
-- alter publication supabase_realtime drop table if exists public.important_reminders;
-- drop trigger if exists update_important_reminders_updated_at on public.important_reminders;
-- drop table if exists public.important_reminders cascade;
--
-- commit;
