# Phase 3: Tank and Hatch Records

Migration: `supabase/migrations/20260928174005_phase3_records.sql`

**Status: not applied.** Review, then apply by hand in the Supabase SQL editor
(or `supabase db push`). The database (`janwtypmneybfzeiauzt`) is shared with
blueeyedclowns.com and the finance tables. This migration touches none of the
finance tables, `orders`/`order_items`, `blog_posts` or `clownfish`. It does
NOT rename, drop or retype any existing `hatch_batches` column, and does NOT
change `hatch_batches` read policies.

## What changes

### 1. Tanks table: label and bank layout fields

| Field | Type | Constraints | Purpose |
|---|---|---|---|
| `system` | text | null or A-F | System letter (A, B, C, D, E, F) |
| `row_no` | int | null or > 0 | Row number within system |
| `tank_no` | int | null or > 0 | Tank number within row |
| `label` | text | null or matches `^[A-Z][0-9]+-[0-9]+$` | Derived or parsed label (e.g., B3-10) |
| `bank_role` | text | null or in ('mated_pair', 'grow_out', 'hatch') | Tank's function in the facility |

**Label format:** `[System][Row]-[Tank]` (e.g., `B3-10` = System B, Row 3, Tank 10)

**Trigger:** `sync_tank_label()` keeps `label` and `system`/`row_no`/`tank_no` in sync:
- If all three components are set and label is null, derives label
- If label is set and components are null, parses label into components
- If both are set, validates they match (raises error on mismatch)

**Partial unique index:** `tanks_label_unique_idx` on `label` WHERE `label IS NOT NULL`
(multiple null labels are allowed, but non-null labels must be unique)

**Backfill:** The migration automatically backfills labels for existing tank rows
whose `name` matches either:
- Dashed format: `^[A-Z][0-9]+-[0-9]+$` (e.g., A1-12)
- Undashed format: `^[A-F][1-4][0-9]{1,2}$` (e.g., A112 → A1-12, F34 → F3-4)

The undashed format is parsed as: system letter + single-digit row + remaining digits as tank number.
It only sets the new columns; it does NOT modify or delete any existing tank rows.

**Expected backfill count for live data:** 288 tanks (290 total - 2 unparseable: A1A and H11)

### 2. Hatches table: frozen as legacy

| Change | Before | After |
|---|---|---|
| Insert policy | `hatches_authenticated_insert` (any authenticated user) | `Admins can insert hatches` (admin-only) |
| Update policy | `hatches_authenticated_update` (any authenticated user) | `Admins can update hatches` (admin-only) |
| Delete policy | `hatches_authenticated_delete` (any authenticated user) | `Admins can delete hatches` (admin-only) |
| Read policy | `Allow authenticated read` (unchanged) | `Allow authenticated read` (unchanged) |
| Table comment | None | "DEPRECATED: Legacy clutch records. Use hatch_batches for new records. Read-only for workers; admin-only writes." |

Workers can still view legacy hatches, but only admins can create, update, or delete them.

### 3. Hatch_batches: NO CHANGES

Phase 3 leaves `hatch_batches` completely untouched. The table already has `parent_tank_id`,
`hatch_tank_id`, `current_tank_id`, and `transfer_from_tank_label`/`transfer_to_tank_label`
columns for tank tracking, so adding a generic `tank_id` would be ambiguous.

The website reads `hatch_batches` with the service role and depends on the current schema,
so Phase 3 makes no changes to this table at all.

## Documented bank layout vs. actual tanks

From the business handbook:

| System | Bank Role | Rows | Tanks per Row | Documented Total | Actual in DB |
|---|---|---|---|---|---|
| A | mated_pair | 4 | 12 | 48 | 48 |
| B | mated_pair | 4 | 12 | 48 | 48 |
| C | grow_out | 2 | 1 | 2 | 48 |
| D | grow_out | 4 | 3 | 12 | 48 |
| E | hatch | 3 | 10 | 30 | 48 |
| F | grow_out | 3 | 4 | 12 | 48 |
| **Total** | | | | **152** | **288** |

**Important:** Systems A and B match the documented layout. However, systems C-F each have a full 4x12 grid (48 tanks) in the live database, which exceeds the documented layout by 136 tanks total. The migration does NOT delete or hide these extra tanks. Whether to keep, consolidate, or document them is a decision for Chris.

The extra tanks in C-F may be:
- Physical tanks that exist but weren't documented
- Future expansion capacity
- Historical data that should be preserved
- Organizational decision pending

The reconciliation report identifies which of these extra tanks are referenced by `hatch_batches` or `mated_pairs`, helping Chris decide which ones are actively in use.

## Using the reconcile report

**File:** `supabase/sql/phase3_reconcile_report.sql` (READ-ONLY, changes nothing)

This file runs SELECT-only queries that compare existing tanks with the documented layout.
It parses tank names using the same logic as the migration, so it can be run BEFORE the migration.

**Reports:**
1. **Tanks per system:** Compares actual tank counts vs. documented layout
2. **Extras beyond documented layout:** Lists the 136 C-F tanks beyond documented rows/tanks
3. **Unparseable tank names:** Lists names that don't match either format (A1A, H11)
4. **Extra tank references:** For each extra tank, shows if any `hatch_batches` (parent_tank_id, hatch_tank_id, current_tank_id) or `mated_pairs` reference it
5. **Summary statistics:** Total tanks, format breakdown, distinct systems

**Usage:**
- Run this in Supabase SQL Editor BEFORE applying the migration
- Review Report 4 to see which extra tanks are actively used
- Decide which extras to keep (they won't be deleted by the migration)
- The migration will label all parseable tanks automatically

## Manual steps (Supabase dashboard)

**Prerequisites:**
- [ ] Phase 0 security lockdown applied (or reviewed for conflicts)
- [ ] Backup the `tanks`, `hatches`, and `hatch_batches` tables

**Steps:**
1. **Run the reconcile report:** `supabase/sql/phase3_reconcile_report.sql`
   - Review Report 1: tanks per system (shows 48 tanks per system vs. documented)
   - Review Report 2: the 136 extra C-F tanks beyond documented layout
   - Review Report 3: unparseable names (A1A, H11)
   - Review Report 4: which extra tanks are referenced by hatch_batches or mated_pairs
   - Decide which extra tanks to keep (the migration won't delete any)

2. **Apply the migration:** `supabase/migrations/20260928174005_phase3_records.sql`
   - Copy/paste into Supabase SQL Editor
   - Click "Run"
   - Check the output for the NOTICE line: "Backfilled labels for 0 dashed and 288 undashed tank name(s)"
   - Verify no errors

3. **Verify the migration:**
   ```sql
   -- Check new columns exist
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'tanks'
     AND column_name IN ('system', 'row_no', 'tank_no', 'label', 'bank_role');

   -- Check trigger exists
   SELECT trigger_name, event_manipulation
   FROM information_schema.triggers
   WHERE trigger_name = 'sync_tank_label_trigger';

   -- Check hatches policies
   SELECT policyname, cmd, roles
   FROM pg_policies
   WHERE tablename = 'hatches';

   ```

4. **Deploy the app:** Push and deploy the updated code
   - Admins see the new Tanks page under Admin → Tanks
   - Admins can set labels and bank roles for existing tanks
   - Workers see deprecation notices on legacy hatches

## Test plan (after applying)

### 1. Migration applied successfully
- [ ] No errors in SQL Editor
- [ ] NOTICE output shows "Backfilled labels for 0 dashed and 288 undashed tank name(s)"
- [ ] New columns exist on `tanks` (see verification queries above)
- [ ] Trigger `sync_tank_label_trigger` exists
- [ ] Hatches policies changed to admin-only writes

### 2. Tank label trigger works
As an admin, test the trigger via Supabase SQL Editor or the app:

**Test 1: Derive label from components**
```sql
INSERT INTO tanks (name, system, row_no, tank_no, status)
VALUES ('Test Tank 1', 'A', 1, 5, 'active')
RETURNING id, name, label, system, row_no, tank_no;
-- Expected: label = 'A1-5'
```

**Test 2: Parse components from label**
```sql
INSERT INTO tanks (name, label, status)
VALUES ('Test Tank 2', 'B3-10', 'active')
RETURNING id, name, label, system, row_no, tank_no;
-- Expected: system = 'B', row_no = 3, tank_no = 10
```

**Test 3: Normalize label**
```sql
INSERT INTO tanks (name, label, status)
VALUES ('Test Tank 3', 'c01-01', 'active')
RETURNING label, system, row_no, tank_no;
-- Expected: label = 'C1-1', system = 'C', row_no = 1, tank_no = 1 (normalized and uppercased)
```

**Test 4: Update existing tank label**
```sql
UPDATE tanks SET label = 'F2-3' WHERE name = 'Some existing tank';
-- Expected: system = 'F', row_no = 2, tank_no = 3
```

### 3. Hatches table is read-only for workers
- [ ] As a worker, try to INSERT into `hatches` via Supabase client
  ```js
  await supabase.from('hatches').insert({ pair_id: '...', hatch_date: '2026-09-28' })
  // Expected: error or 0 rows inserted
  ```
- [ ] As an admin, the same INSERT should succeed
- [ ] Workers can still SELECT from `hatches`
- [ ] App shows deprecation notices on hatches UI

### 4. Admin Tanks page works
- [ ] Log in as admin
- [ ] Navigate to Admin → Tanks
- [ ] See tanks grouped by system and row
- [ ] Click a tank and edit its label (test both formats: label or components)
- [ ] Save and verify the label/components are in sync
- [ ] Filter by system and bank role

### 5. Website hatch pages still load
- [ ] Visit blueeyedclowns.com hatch journal page
- [ ] Visit a hatch detail page
- [ ] Verify no errors (the website reads `hatch_batches` with service role, bypassing RLS)

### 6. Reconcile report runs
- [ ] Run `supabase/sql/phase3_reconcile_report.sql`
- [ ] Review the 5 report sections
- [ ] Verify Report 2 (duplicates) is empty after migration

## Rollback

The migration file ends with commented rollback SQL that:
1. Removes the trigger and function
2. Drops the new tank columns (system, row_no, tank_no, label, bank_role)
3. Restores hatches authenticated write policies
4. Removes hatch_batches tank link columns (if added by this migration)

**To rollback:**
1. Copy the rollback SQL from the bottom of the migration file
2. Uncomment it (remove the `--` prefixes)
3. Run it in Supabase SQL Editor
4. Revert and redeploy the app code

**Note:** The rollback will NOT delete the 290 existing tank rows. It only removes
the new label-related columns.

## What NOT to do

- ❌ Do NOT apply this migration without reviewing the reconcile report first
- ❌ Do NOT touch `hatch_batches` (Phase 3 leaves it completely alone)
- ❌ Do NOT delete or modify existing tank rows (the migration only adds columns)
- ❌ Do NOT hardcode any tank, hatch, or count data (leave unknowns null)
- ❌ Do NOT set `bank_role` automatically (the extra C-F tanks are a decision for Chris)

## What the migration auto-backfills

The migration automatically sets the new label fields for existing tank rows whose
`name` matches the undashed format `^[A-F][1-4][0-9]{1,2}$`.

For the live data with names like A11, A112, B34, F412:
- `A112` → `label = 'A1-12'`, `system = 'A'`, `row_no = 1`, `tank_no = 12`
- `F34` → `label = 'F3-4'`, `system = 'F'`, `row_no = 3`, `tank_no = 4`
- `B21` → `label = 'B2-1'`, `system = 'B'`, `row_no = 2`, `tank_no = 1`

For the live database:
- 288 tanks will be backfilled (A11-A412, B11-B412, ..., F11-F412)
- 2 tanks will be left unlabelled (A1A, H11) because they don't match the pattern
- `bank_role` will be left NULL for all tanks (manual decision for Chris)

It does NOT:
- Modify `name` or any other existing column
- Delete or rename any tank
- Change tanks whose names don't match either pattern
- Invent or guess data
- Set `bank_role` automatically

The NOTICE output tells you how many rows were backfilled: "Backfilled labels for 0 dashed and 288 undashed tank name(s)"

## Known limitations

1. **Extra C-F tanks are a decision for Chris:** The migration backfills all 288
   parseable tanks, including the 136 extras in systems C-F that exceed the
   documented layout. The reconciliation report shows which extras are referenced
   by hatch_batches or mated_pairs.

2. **No validation of bank_role against documented layout:** The migration allows
   any tank to have any bank_role. It's up to the admin to set roles correctly.

3. **Label trigger allows any system letter:** The trigger accepts A-Z, not just A-F,
   so H1-1 works. This accommodates the existing H11 tank after manual labeling.

## Questions?

See the reconcile report and seed file comments for more details, or ask in #becapp-dev.
