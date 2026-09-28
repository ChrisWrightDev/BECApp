-- =====================================================================
-- Phase 3: Tank and Hatch Records (BECApp)
-- Project: janwtypmneybfzeiauzt (SHARED with blueeyedclowns.com + finance)
--
-- DO NOT apply without review. Adds tank label/layout fields, freezes the
-- legacy hatches table, and links hatch_batches to tanks. Does NOT touch
-- existing tank rows (except optional backfill of labels that already match
-- the dashed pattern). Does NOT rename, drop or retype any existing
-- hatch_batches column, and does NOT change hatch_batches read policies.
-- Rollback SQL is at the bottom of this file (commented out).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- (a) tanks: add label and bank layout columns
-- ---------------------------------------------------------------------
alter table public.tanks
  add column if not exists system text check (system is null or system ~ '^[A-F]$'),
  add column if not exists row_no int check (row_no is null or row_no > 0),
  add column if not exists tank_no int check (tank_no is null or tank_no > 0),
  add column if not exists label text check (label is null or label ~ '^[A-Z][0-9]+-[0-9]+$'),
  add column if not exists bank_role text check (bank_role is null or bank_role in ('mated_pair', 'grow_out', 'hatch'));

-- Partial unique index on label (null labels are not indexed, so multiple nulls are allowed)
create unique index if not exists tanks_label_unique_idx on public.tanks (label) where label is not null;

-- Trigger function to keep label and system/row_no/tank_no in sync
create or replace function public.sync_tank_label()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- If all three components are set and label is null, derive label
  if new.system is not null and new.row_no is not null and new.tank_no is not null and new.label is null then
    new.label := new.system || new.row_no || '-' || new.tank_no;
  -- If label is set and components are null, parse label into components
  elsif new.label is not null and (new.system is null or new.row_no is null or new.tank_no is null) then
    -- Parse label format: [A-Z][0-9]+-[0-9]+
    if new.label ~ '^[A-Z][0-9]+-[0-9]+$' then
      new.system := substring(new.label from 1 for 1);
      new.row_no := substring(new.label from 2 for position('-' in new.label) - 2)::int;
      new.tank_no := substring(new.label from position('-' in new.label) + 1)::int;
    end if;
  -- If both label and components are set, verify they match
  elsif new.label is not null and new.system is not null and new.row_no is not null and new.tank_no is not null then
    declare
      derived_label text;
    begin
      derived_label := new.system || new.row_no || '-' || new.tank_no;
      if new.label != derived_label then
        raise exception 'Label "%" does not match system/row/tank components (expected "%")',
          new.label, derived_label
          using errcode = '23514'; -- check_violation
      end if;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_tank_label_trigger on public.tanks;
create trigger sync_tank_label_trigger
  before insert or update on public.tanks
  for each row
  execute function public.sync_tank_label();

-- Optional backfill: set label fields for existing tanks whose names already match the dashed pattern
-- This will NOT modify or delete any existing tank rows, only set the new columns when names match.
-- Count how many rows would be affected (for reporting):
do $$
declare
  affected_count int;
begin
  select count(*) into affected_count
  from public.tanks
  where name ~ '^[A-Z][0-9]+-[0-9]+$'
    and label is null;
  
  raise notice 'Backfilling labels for % existing tank(s) whose names match the dashed pattern', affected_count;

  -- Perform the backfill
  update public.tanks
  set label = name
  where name ~ '^[A-Z][0-9]+-[0-9]+$'
    and label is null;
end $$;

-- ---------------------------------------------------------------------
-- (b) hatches: freeze as legacy table (deprecated in favor of hatch_batches)
-- ---------------------------------------------------------------------
-- Drop existing write policies for authenticated users
drop policy if exists "hatches_authenticated_insert" on public.hatches;
drop policy if exists "hatches_authenticated_update" on public.hatches;
drop policy if exists "hatches_authenticated_delete" on public.hatches;

-- Add admin-only write policies
create policy "Admins can insert hatches"
  on public.hatches
  for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

create policy "Admins can update hatches"
  on public.hatches
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins can delete hatches"
  on public.hatches
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));

comment on table public.hatches is 
  'DEPRECATED: Legacy clutch records. Use hatch_batches for new records. Read-only for workers; admin-only writes.';

-- ---------------------------------------------------------------------
-- (c) hatch_batches: add tank link columns if they don''t exist
-- ---------------------------------------------------------------------
-- Check existing columns first (may already exist)
do $$
begin
  -- Add tank_id FK column if it doesn't exist
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'hatch_batches'
      and column_name = 'tank_id'
  ) then
    alter table public.hatch_batches
      add column tank_id uuid references public.tanks(id) on delete set null;
    raise notice 'Added tank_id column to hatch_batches';
  else
    raise notice 'tank_id column already exists in hatch_batches';
  end if;

  -- Add tank_label text column if it doesn't exist
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'hatch_batches'
      and column_name = 'tank_label'
  ) then
    alter table public.hatch_batches
      add column tank_label text;
    raise notice 'Added tank_label column to hatch_batches';
  else
    raise notice 'tank_label column already exists in hatch_batches';
  end if;
end $$;

commit;

-- =====================================================================
-- ROLLBACK (run manually only if needed)
-- =====================================================================
-- begin;
--
-- -- (a) tanks: remove label and layout columns
-- drop trigger if exists sync_tank_label_trigger on public.tanks;
-- drop function if exists public.sync_tank_label();
-- drop index if exists tanks_label_unique_idx;
-- alter table public.tanks
--   drop column if exists system,
--   drop column if exists row_no,
--   drop column if exists tank_no,
--   drop column if exists label,
--   drop column if exists bank_role;
--
-- -- (b) hatches: restore authenticated write policies
-- drop policy if exists "Admins can insert hatches" on public.hatches;
-- drop policy if exists "Admins can update hatches" on public.hatches;
-- drop policy if exists "Admins can delete hatches" on public.hatches;
-- create policy "hatches_authenticated_insert" on public.hatches
--   for insert with check (auth.role() = 'authenticated');
-- create policy "hatches_authenticated_update" on public.hatches
--   for update using (auth.role() = 'authenticated');
-- create policy "hatches_authenticated_delete" on public.hatches
--   for delete using (auth.role() = 'authenticated');
-- comment on table public.hatches is null;
--
-- -- (c) hatch_batches: remove tank link columns
-- alter table public.hatch_batches
--   drop column if exists tank_id,
--   drop column if exists tank_label;
--
-- commit;
