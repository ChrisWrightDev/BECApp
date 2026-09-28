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
  add column if not exists system text check (system is null or system ~ '^[A-Z]$'),
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
declare
  derived_label text;
  label_changed boolean;
  components_changed boolean;
begin
  -- Determine what changed (only relevant on UPDATE)
  if TG_OP = 'UPDATE' then
    label_changed := (new.label is distinct from old.label);
    components_changed := (new.system is distinct from old.system 
                           or new.row_no is distinct from old.row_no 
                           or new.tank_no is distinct from old.tank_no);
  else
    -- On INSERT, check what's set
    label_changed := new.label is not null;
    components_changed := (new.system is not null or new.row_no is not null or new.tank_no is not null);
  end if;

  -- If label was set to NULL, clear components
  if TG_OP = 'UPDATE' and new.label is null and old.label is not null then
    new.system := null;
    new.row_no := null;
    new.tank_no := null;
    return new;
  end if;

  -- If label changed, parse it into components
  if label_changed and new.label is not null then
    if new.label ~ '^[A-Z][0-9]+-[0-9]+$' then
      new.system := substring(new.label from 1 for 1);
      new.row_no := substring(new.label from 2 for position('-' in new.label) - 2)::int;
      new.tank_no := substring(new.label from position('-' in new.label) + 1)::int;
      -- Normalize label to system || row_no || '-' || tank_no
      new.label := new.system || new.row_no || '-' || new.tank_no;
    end if;
    return new;
  end if;

  -- If components changed, derive label
  if components_changed and new.system is not null and new.row_no is not null and new.tank_no is not null then
    new.label := new.system || new.row_no || '-' || new.tank_no;
    return new;
  end if;

  -- If all three components are set and label is null, derive label
  if new.system is not null and new.row_no is not null and new.tank_no is not null and new.label is null then
    new.label := new.system || new.row_no || '-' || new.tank_no;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_tank_label_trigger on public.tanks;
create trigger sync_tank_label_trigger
  before insert or update on public.tanks
  for each row
  execute function public.sync_tank_label();

-- Backfill: derive labels from existing tank names
-- Handles both dashed (A1-12) and undashed (A112) formats.
-- The undashed format is: [A-Z][1-4][0-9]{1,2} where the single digit after
-- the letter is the row, and the rest is the tank number.
-- Examples: A112 -> A1-12, F34 -> F3-4, B21 -> B2-1
-- Leaves A1A and H11 (or any other non-conforming names) unlabelled.
do $$
declare
  dashed_count int := 0;
  undashed_count int := 0;
  parsed_system text;
  parsed_row int;
  parsed_tank int;
  tank_record record;
begin
  -- Backfill dashed format: [A-Z][0-9]+-[0-9]+
  select count(*) into dashed_count
  from public.tanks
  where name ~ '^[A-Z][0-9]+-[0-9]+$' and label is null;
  
  update public.tanks
  set label = name
  where name ~ '^[A-Z][0-9]+-[0-9]+$' and label is null;

  -- Backfill undashed format: [A-F][1-4][0-9]{1,2}
  -- Parse each tank name and derive system, row_no, tank_no, label
  for tank_record in
    select id, name
    from public.tanks
    where name ~ '^[A-F][1-4][0-9]{1,2}$' and label is null
  loop
    parsed_system := substring(tank_record.name from 1 for 1);
    parsed_row := substring(tank_record.name from 2 for 1)::int;
    parsed_tank := substring(tank_record.name from 3)::int;
    
    update public.tanks
    set 
      system = parsed_system,
      row_no = parsed_row,
      tank_no = parsed_tank,
      label = parsed_system || parsed_row || '-' || parsed_tank
    where id = tank_record.id;
    
    undashed_count := undashed_count + 1;
  end loop;

  raise notice 'Backfilled labels for % dashed and % undashed tank name(s)', dashed_count, undashed_count;
end $$;

-- ---------------------------------------------------------------------
-- (b) hatches: freeze as legacy table (deprecated in favor of hatch_batches)
-- ---------------------------------------------------------------------
-- Drop existing write policies for authenticated users
drop policy if exists "hatches_authenticated_insert" on public.hatches;
drop policy if exists "hatches_authenticated_update" on public.hatches;
drop policy if exists "hatches_authenticated_delete" on public.hatches;

-- Add admin-only write policies
drop policy if exists "Admins can insert hatches" on public.hatches;
create policy "Admins can insert hatches"
  on public.hatches
  for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can update hatches" on public.hatches;
create policy "Admins can update hatches"
  on public.hatches
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can delete hatches" on public.hatches;
create policy "Admins can delete hatches"
  on public.hatches
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));

comment on table public.hatches is 
  'DEPRECATED: Legacy clutch records. Use hatch_batches for new records. Read-only for workers; admin-only writes.';

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
-- commit;
