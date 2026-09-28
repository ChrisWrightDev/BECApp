-- =====================================================================
-- Phase 3: Tank Reconciliation Report (BECApp)
-- READ-ONLY queries to compare existing tanks with documented layout
--
-- This file changes NOTHING. It only reports discrepancies between:
-- 1. Existing tank rows in the database
-- 2. The documented bank layout from the business handbook
--
-- Run this before applying the seed file to identify conflicts and gaps.
-- Chris should review the output and decide what to do with each row.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Report 1: Existing tanks whose names DON'T match the dashed pattern
-- ---------------------------------------------------------------------
select
  'Non-standard names' as report_type,
  id,
  name,
  status,
  label,
  description,
  capacity_gallons,
  system,
  row_no,
  tank_no,
  bank_role
from public.tanks
where name !~ '^[A-Z][0-9]+-[0-9]+$'
order by name;

-- ---------------------------------------------------------------------
-- Report 2: Duplicate labels (should never happen after migration)
-- ---------------------------------------------------------------------
select
  'Duplicate labels' as report_type,
  label,
  count(*) as duplicate_count,
  array_agg(id order by created_at) as tank_ids,
  array_agg(name order by created_at) as tank_names
from public.tanks
where label is not null
group by label
having count(*) > 1
order by label;

-- ---------------------------------------------------------------------
-- Report 3: Documented layout labels that have NO corresponding tank row
-- ---------------------------------------------------------------------
-- Generate all expected labels from the documented layout
with expected_labels as (
  -- System A: mated_pair, 4 rows x 12 tanks
  select 'A' || r || '-' || t as label, 'A' as system, 'mated_pair' as bank_role
  from generate_series(1, 4) r
  cross join generate_series(1, 12) t
  
  union all
  
  -- System B: mated_pair, 4 rows x 12 tanks
  select 'B' || r || '-' || t as label, 'B' as system, 'mated_pair' as bank_role
  from generate_series(1, 4) r
  cross join generate_series(1, 12) t
  
  union all
  
  -- System C: grow_out, 2 rows x 1 tank
  select 'C' || r || '-1' as label, 'C' as system, 'grow_out' as bank_role
  from generate_series(1, 2) r
  
  union all
  
  -- System D: grow_out, 4 rows x 3 tanks
  select 'D' || r || '-' || t as label, 'D' as system, 'grow_out' as bank_role
  from generate_series(1, 4) r
  cross join generate_series(1, 3) t
  
  union all
  
  -- System E: hatch, 3 rows x 10 tanks
  select 'E' || r || '-' || t as label, 'E' as system, 'hatch' as bank_role
  from generate_series(1, 3) r
  cross join generate_series(1, 10) t
  
  union all
  
  -- System F: grow_out, 3 rows x 4 tanks
  select 'F' || r || '-' || t as label, 'F' as system, 'grow_out' as bank_role
  from generate_series(1, 3) r
  cross join generate_series(1, 4) t
)
select
  'Missing from database' as report_type,
  el.label,
  el.system,
  el.bank_role,
  'Run phase3_tank_layout.sql seed to create these placeholders' as suggestion
from expected_labels el
left join public.tanks t on t.label = el.label
where t.id is null
order by el.label;

-- ---------------------------------------------------------------------
-- Report 4: Existing tanks with labels that DON'T match documented layout
-- ---------------------------------------------------------------------
-- Generate all expected labels from the documented layout
with expected_labels as (
  -- System A: mated_pair, 4 rows x 12 tanks
  select 'A' || r || '-' || t as label, 'A' as system, 'mated_pair' as bank_role
  from generate_series(1, 4) r
  cross join generate_series(1, 12) t
  
  union all
  
  -- System B: mated_pair, 4 rows x 12 tanks
  select 'B' || r || '-' || t as label, 'B' as system, 'mated_pair' as bank_role
  from generate_series(1, 4) r
  cross join generate_series(1, 12) t
  
  union all
  
  -- System C: grow_out, 2 rows x 1 tank
  select 'C' || r || '-1' as label, 'C' as system, 'grow_out' as bank_role
  from generate_series(1, 2) r
  
  union all
  
  -- System D: grow_out, 4 rows x 3 tanks
  select 'D' || r || '-' || t as label, 'D' as system, 'grow_out' as bank_role
  from generate_series(1, 4) r
  cross join generate_series(1, 3) t
  
  union all
  
  -- System E: hatch, 3 rows x 10 tanks
  select 'E' || r || '-' || t as label, 'E' as system, 'hatch' as bank_role
  from generate_series(1, 3) r
  cross join generate_series(1, 10) t
  
  union all
  
  -- System F: grow_out, 3 rows x 4 tanks
  select 'F' || r || '-' || t as label, 'F' as system, 'grow_out' as bank_role
  from generate_series(1, 3) r
  cross join generate_series(1, 4) t
)
select
  'Label not in documented layout' as report_type,
  t.id,
  t.label,
  t.name,
  t.system,
  t.bank_role as current_bank_role,
  'This tank exists but is not in the documented layout' as note
from public.tanks t
left join expected_labels el on el.label = t.label
where t.label is not null
  and el.label is null
order by t.label;

-- ---------------------------------------------------------------------
-- Report 5: Summary statistics
-- ---------------------------------------------------------------------
select
  'Summary' as report_type,
  count(*) as total_tanks,
  count(*) filter (where label is not null) as tanks_with_labels,
  count(*) filter (where label is null) as tanks_without_labels,
  count(*) filter (where name ~ '^[A-Z][0-9]+-[0-9]+$') as tanks_matching_pattern,
  count(*) filter (where name !~ '^[A-Z][0-9]+-[0-9]+$') as tanks_not_matching_pattern,
  count(distinct system) as distinct_systems,
  count(*) filter (where bank_role = 'mated_pair') as mated_pair_tanks,
  count(*) filter (where bank_role = 'grow_out') as grow_out_tanks,
  count(*) filter (where bank_role = 'hatch') as hatch_tanks,
  count(*) filter (where bank_role is null) as tanks_without_role
from public.tanks;
