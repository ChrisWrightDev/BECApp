-- =====================================================================
-- Phase 3: Tank Reconciliation Report (BECApp)
-- READ-ONLY queries to compare existing tanks with documented layout
--
-- This file changes NOTHING. It reports on the current state of tanks
-- by deriving system, row and tank from the `name` column using the same
-- parsing logic as the migration. Can be run BEFORE the migration.
--
-- Documented layout:
-- - A: 4x12 mated_pair (48 tanks)
-- - B: 4x12 mated_pair (48 tanks)
-- - C: 2x1 grow_out (2 tanks)
-- - D: 4x3 grow_out (12 tanks)
-- - E: 3x10 hatch (30 tanks)
-- - F: 3x4 grow_out (12 tanks)
-- Total documented: 152 tanks
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper CTE: Parse existing tank names into system, row, tank
-- ---------------------------------------------------------------------
with parsed_tanks as (
  select
    id,
    name,
    case
      -- Dashed format: A1-12
      when name ~ '^[A-Z][0-9]+-[0-9]+$' then
        substring(name from 1 for 1)
      -- Undashed format: A112
      when name ~ '^[A-F][1-4][0-9]{1,2}$' then
        substring(name from 1 for 1)
      else null
    end as parsed_system,
    case
      when name ~ '^[A-Z][0-9]+-[0-9]+$' then
        substring(name from 2 for position('-' in name) - 2)::int
      when name ~ '^[A-F][1-4][0-9]{1,2}$' then
        substring(name from 2 for 1)::int
      else null
    end as parsed_row,
    case
      when name ~ '^[A-Z][0-9]+-[0-9]+$' then
        substring(name from position('-' in name) + 1)::int
      when name ~ '^[A-F][1-4][0-9]{1,2}$' then
        substring(name from 3)::int
      else null
    end as parsed_tank
  from public.tanks
),

-- Documented layout constraints
documented_layout as (
  select 'A' as system, 4 as max_row, 12 as max_tank, 'mated_pair' as bank_role
  union all
  select 'B', 4, 12, 'mated_pair'
  union all
  select 'C', 2, 1, 'grow_out'
  union all
  select 'D', 4, 3, 'grow_out'
  union all
  select 'E', 3, 10, 'hatch'
  union all
  select 'F', 3, 4, 'grow_out'
)

-- ---------------------------------------------------------------------
-- Report 1: Tanks per system vs. documented layout
-- ---------------------------------------------------------------------
select
  'Tanks per system' as report_type,
  coalesce(dl.system, pt.parsed_system, 'Unparseable') as system,
  dl.max_row as documented_rows,
  dl.max_tank as documented_tanks_per_row,
  (dl.max_row * dl.max_tank) as documented_total,
  dl.bank_role as documented_role,
  count(pt.id) as actual_count
from documented_layout dl
full outer join parsed_tanks pt on pt.parsed_system = dl.system
group by dl.system, pt.parsed_system, dl.max_row, dl.max_tank, dl.bank_role
order by coalesce(dl.system, pt.parsed_system);

-- ---------------------------------------------------------------------
-- Report 2: Tanks outside documented rows/tanks (extras)
-- ---------------------------------------------------------------------
select
  'Extras beyond documented layout' as report_type,
  pt.id,
  pt.name,
  pt.parsed_system as system,
  pt.parsed_row as row_no,
  pt.parsed_tank as tank_no,
  dl.max_row as doc_max_row,
  dl.max_tank as doc_max_tank,
  case
    when pt.parsed_row > dl.max_row then 'Row exceeds documented'
    when pt.parsed_tank > dl.max_tank then 'Tank exceeds documented'
    else 'Within documented range'
  end as status
from parsed_tanks pt
inner join documented_layout dl on pt.parsed_system = dl.system
where pt.parsed_row > dl.max_row or pt.parsed_tank > dl.max_tank
order by pt.parsed_system, pt.parsed_row, pt.parsed_tank;

-- ---------------------------------------------------------------------
-- Report 3: Names that don't parse
-- ---------------------------------------------------------------------
select
  'Unparseable tank names' as report_type,
  id,
  name,
  description,
  status
from public.tanks
where name !~ '^[A-Z][0-9]+-[0-9]+$'
  and name !~ '^[A-F][1-4][0-9]{1,2}$'
order by name;

-- ---------------------------------------------------------------------
-- Report 4: References to extra tanks from hatch_batches or mated_pairs
-- ---------------------------------------------------------------------
-- For each extra tank, check if any hatch_batches or mated_pairs reference it
with parsed_tanks as (
  select
    id,
    name,
    case
      when name ~ '^[A-Z][0-9]+-[0-9]+$' then
        substring(name from 1 for 1)
      when name ~ '^[A-F][1-4][0-9]{1,2}$' then
        substring(name from 1 for 1)
      else null
    end as parsed_system,
    case
      when name ~ '^[A-Z][0-9]+-[0-9]+$' then
        substring(name from 2 for position('-' in name) - 2)::int
      when name ~ '^[A-F][1-4][0-9]{1,2}$' then
        substring(name from 2 for 1)::int
      else null
    end as parsed_row,
    case
      when name ~ '^[A-Z][0-9]+-[0-9]+$' then
        substring(name from position('-' in name) + 1)::int
      when name ~ '^[A-F][1-4][0-9]{1,2}$' then
        substring(name from 3)::int
      else null
    end as parsed_tank
  from public.tanks
),

documented_layout as (
  select 'A' as system, 4 as max_row, 12 as max_tank
  union all select 'B', 4, 12
  union all select 'C', 2, 1
  union all select 'D', 4, 3
  union all select 'E', 3, 10
  union all select 'F', 3, 4
),

extra_tanks as (
  select pt.id, pt.name, pt.parsed_system, pt.parsed_row, pt.parsed_tank
  from parsed_tanks pt
  inner join documented_layout dl on pt.parsed_system = dl.system
  where pt.parsed_row > dl.max_row or pt.parsed_tank > dl.max_tank
)

select
  'Extra tank references' as report_type,
  et.name,
  et.parsed_system || et.parsed_row || '-' || et.parsed_tank as derived_label,
  (select count(*) from hatch_batches where parent_tank_id = et.id) as hatch_batches_parent,
  (select count(*) from hatch_batches where hatch_tank_id = et.id) as hatch_batches_hatch,
  (select count(*) from hatch_batches where current_tank_id = et.id) as hatch_batches_current,
  (select count(*) from mated_pairs where tank_id = et.id) as mated_pairs_count
from extra_tanks et
order by et.parsed_system, et.parsed_row, et.parsed_tank;

-- ---------------------------------------------------------------------
-- Report 5: Summary statistics
-- ---------------------------------------------------------------------
select
  'Summary' as report_type,
  count(*) as total_tanks,
  count(*) filter (where name ~ '^[A-Z][0-9]+-[0-9]+$') as dashed_format,
  count(*) filter (where name ~ '^[A-F][1-4][0-9]{1,2}$') as undashed_format,
  count(*) filter (where name !~ '^[A-Z][0-9]+-[0-9]+$' and name !~ '^[A-F][1-4][0-9]{1,2}$') as unparseable,
  count(distinct case
    when name ~ '^[A-Z][0-9]+-[0-9]+$' then substring(name from 1 for 1)
    when name ~ '^[A-F][1-4][0-9]{1,2}$' then substring(name from 1 for 1)
  end) as distinct_systems
from public.tanks;
