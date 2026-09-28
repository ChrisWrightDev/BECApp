-- =====================================================================
-- Phase 3: Tank Layout Seed Data (BECApp)
-- OPTIONAL SEED FILE - NOT A MIGRATION
--
-- This file is NOT applied automatically. It inserts tank placeholder rows
-- for the documented bank layout from the business handbook:
-- - System A: mated_pair, 4 rows x 12 tanks (A1-1 to A4-12)
-- - System B: mated_pair, 4 rows x 12 tanks (B1-1 to B4-12)
-- - System C: grow_out, 2 rows x 1 tank (C1-1 to C2-1)
-- - System D: grow_out, 4 rows x 3 tanks (D1-1 to D4-3)
-- - System E: hatch, 3 rows x 10 tanks (E1-1 to E3-10)
-- - System F: grow_out, 3 rows x 4 tanks (F1-1 to F3-4)
--
-- IMPORTANT: This layout is derived ONLY from the documented handbook.
-- It MUST be reviewed against the actual tank room before running.
-- Use supabase/sql/phase3_reconcile_report.sql to compare existing tank
-- names with this layout before applying this seed.
--
-- Usage:
--   1. Run phase3_reconcile_report.sql to see gaps and conflicts
--   2. Review this seed against the physical tank room
--   3. Run this file in Supabase SQL Editor if it matches reality
--
-- This seed uses ON CONFLICT (label) DO NOTHING, so it won't overwrite
-- existing tanks that already have these labels. It only creates placeholders
-- where labels don't exist yet.
-- =====================================================================

begin;

-- System A: mated_pair, 4 rows x 12 tanks
insert into public.tanks (system, row_no, tank_no, label, bank_role, name, status)
select
  'A' as system,
  r as row_no,
  t as tank_no,
  'A' || r || '-' || t as label,
  'mated_pair' as bank_role,
  'A' || r || '-' || t as name,
  'active' as status
from generate_series(1, 4) r
cross join generate_series(1, 12) t
on conflict (label) do nothing;

-- System B: mated_pair, 4 rows x 12 tanks
insert into public.tanks (system, row_no, tank_no, label, bank_role, name, status)
select
  'B' as system,
  r as row_no,
  t as tank_no,
  'B' || r || '-' || t as label,
  'mated_pair' as bank_role,
  'B' || r || '-' || t as name,
  'active' as status
from generate_series(1, 4) r
cross join generate_series(1, 12) t
on conflict (label) do nothing;

-- System C: grow_out, 2 rows x 1 tank
insert into public.tanks (system, row_no, tank_no, label, bank_role, name, status)
select
  'C' as system,
  r as row_no,
  1 as tank_no,
  'C' || r || '-1' as label,
  'grow_out' as bank_role,
  'C' || r || '-1' as name,
  'active' as status
from generate_series(1, 2) r
on conflict (label) do nothing;

-- System D: grow_out, 4 rows x 3 tanks
insert into public.tanks (system, row_no, tank_no, label, bank_role, name, status)
select
  'D' as system,
  r as row_no,
  t as tank_no,
  'D' || r || '-' || t as label,
  'grow_out' as bank_role,
  'D' || r || '-' || t as name,
  'active' as status
from generate_series(1, 4) r
cross join generate_series(1, 3) t
on conflict (label) do nothing;

-- System E: hatch, 3 rows x 10 tanks
insert into public.tanks (system, row_no, tank_no, label, bank_role, name, status)
select
  'E' as system,
  r as row_no,
  t as tank_no,
  'E' || r || '-' || t as label,
  'hatch' as bank_role,
  'E' || r || '-' || t as name,
  'active' as status
from generate_series(1, 3) r
cross join generate_series(1, 10) t
on conflict (label) do nothing;

-- System F: grow_out, 3 rows x 4 tanks
insert into public.tanks (system, row_no, tank_no, label, bank_role, name, status)
select
  'F' as system,
  r as row_no,
  t as tank_no,
  'F' || r || '-' || t as label,
  'grow_out' as bank_role,
  'F' || r || '-' || t as name,
  'active' as status
from generate_series(1, 3) r
cross join generate_series(1, 4) t
on conflict (label) do nothing;

commit;

-- Report how many tanks were inserted
select 
  count(*) as total_tanks,
  count(*) filter (where bank_role = 'mated_pair') as mated_pair_tanks,
  count(*) filter (where bank_role = 'grow_out') as grow_out_tanks,
  count(*) filter (where bank_role = 'hatch') as hatch_tanks
from public.tanks
where label is not null;
