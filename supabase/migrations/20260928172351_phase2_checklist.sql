-- =====================================================================
-- Phase 2 daily checklist (BECApp)
-- Project: janwtypmneybfzeiauzt (SHARED with blueeyedclowns.com + finance)
--
-- DO NOT apply without review. Creates checklist_days and checklist_items
-- tables for the operations agent to write daily checklists that workers
-- complete in the app. Does NOT touch finance tables, orders/order_items,
-- blog_posts, clownfish, or hatch_batches data/policies.
-- Rollback SQL is at the bottom of this file (commented out).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- (a) checklist_days: one row per work date, published by the ops agent
-- ---------------------------------------------------------------------
create table public.checklist_days (
  id uuid primary key default gen_random_uuid(),
  work_date date not null unique,
  status text not null default 'published' check (status in ('draft', 'published', 'closed')),
  created_by text not null default 'operations_agent',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.checklist_days is 'Daily checklist container, one per work date';
comment on column public.checklist_days.work_date is 'The work date (America/Chicago) this checklist is for';
comment on column public.checklist_days.status is 'draft (ops agent writing), published (visible to workers), closed (past day)';
comment on column public.checklist_days.created_by is 'Typically operations_agent or an admin username';

create index idx_checklist_days_work_date on public.checklist_days(work_date);
create index idx_checklist_days_status on public.checklist_days(status);

-- updated_at trigger for checklist_days
create trigger update_checklist_days_updated_at
  before update on public.checklist_days
  for each row
  execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- (b) checklist_items: the individual tasks within a checklist day
-- ---------------------------------------------------------------------
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.checklist_days(id) on delete cascade,
  block text not null check (block in ('pre_morning', 'morning', 'midday', 'afternoon', 'evening')),
  sort_order int not null,
  title text not null,
  detail text,
  category text not null default 'other' check (category in ('feeding', 'temp_check', 'hatch_check', 'cleaning', 'move', 'other')),
  tank_id uuid references public.tanks(id) on delete set null,
  tank_label text,
  batch_id uuid references public.hatch_batches(id) on delete set null,
  requires_value boolean not null default false,
  value_text text,
  done boolean not null default false,
  done_at timestamptz,
  done_by uuid references auth.users(id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (day_id, block, sort_order)
);

comment on table public.checklist_items is 'Individual checklist tasks within a day, organized by time block';
comment on column public.checklist_items.block is 'Time block: pre_morning, morning, midday, afternoon, evening';
comment on column public.checklist_items.sort_order is 'Display order within the block';
comment on column public.checklist_items.category is 'Task category for filtering/reporting';
comment on column public.checklist_items.tank_id is 'Optional FK to tanks table';
comment on column public.checklist_items.tank_label is 'Display label (may differ from tanks.name)';
comment on column public.checklist_items.batch_id is 'Optional FK to hatch_batches table';
comment on column public.checklist_items.requires_value is 'If true, value_text must be filled before marking done';
comment on column public.checklist_items.value_text is 'User-entered value (e.g. temperature reading)';
comment on column public.checklist_items.done is 'Completion flag';
comment on column public.checklist_items.done_at is 'Timestamp when marked done';
comment on column public.checklist_items.done_by is 'User who marked it done';
comment on column public.checklist_items.note is 'Optional note from worker';

create index idx_checklist_items_day_id on public.checklist_items(day_id);
create index idx_checklist_items_day_block on public.checklist_items(day_id, block, sort_order);

-- updated_at trigger for checklist_items
create trigger update_checklist_items_updated_at
  before update on public.checklist_items
  for each row
  execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- (c) RLS policies
-- ---------------------------------------------------------------------
alter table public.checklist_days enable row level security;
alter table public.checklist_items enable row level security;

-- Anon gets nothing
revoke all on public.checklist_days from anon;
revoke all on public.checklist_items from anon;

-- Authenticated users can SELECT published or closed days and their items
create policy "Authenticated users can read published/closed days"
  on public.checklist_days
  for select
  to authenticated
  using (status in ('published', 'closed'));

create policy "Authenticated users can read items of published/closed days"
  on public.checklist_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.checklist_days d
      where d.id = checklist_items.day_id
        and d.status in ('published', 'closed')
    )
  );

-- Admins can SELECT all days and items (including draft)
create policy "Admins can read all days"
  on public.checklist_days
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "Admins can read all items"
  on public.checklist_items
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- Authenticated users can UPDATE specific columns on items of published days
-- Column-level grant: done, done_at, done_by, note, value_text
grant update (done, done_at, done_by, note, value_text) on public.checklist_items to authenticated;

create policy "Authenticated users can update completion on published items"
  on public.checklist_items
  for update
  to authenticated
  using (
    exists (
      select 1 from public.checklist_days d
      where d.id = checklist_items.day_id
        and d.status = 'published'
    )
  )
  with check (
    -- Enforce done_by = auth.uid() or null
    (done_by = auth.uid() or done_by is null)
    and
    -- Can only update the allowed columns
    exists (
      select 1 from public.checklist_days d
      where d.id = checklist_items.day_id
        and d.status = 'published'
    )
  );

-- Admins have full control (INSERT, UPDATE, DELETE) via app
-- The ops agent writes with service role (bypasses RLS)
create policy "Admins can manage days"
  on public.checklist_days
  for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins can manage items"
  on public.checklist_items
  for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- (d) Add tables to supabase_realtime publication (idempotent)
-- ---------------------------------------------------------------------
do $$
begin
  -- Add checklist_days if not already in publication
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'checklist_days'
  ) then
    alter publication supabase_realtime add table public.checklist_days;
  end if;

  -- Add checklist_items if not already in publication
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'checklist_items'
  ) then
    alter publication supabase_realtime add table public.checklist_items;
  end if;
end $$;

commit;

-- =====================================================================
-- ROLLBACK (run manually only if needed; drop tables and policies)
-- =====================================================================
-- begin;
--
-- alter publication supabase_realtime drop table if exists public.checklist_items;
-- alter publication supabase_realtime drop table if exists public.checklist_days;
--
-- drop table if exists public.checklist_items cascade;
-- drop table if exists public.checklist_days cascade;
--
-- commit;
