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
whose `name` already exactly matches the dashed pattern `^[A-Z][0-9]+-[0-9]+$`.
It only sets the new columns; it does NOT modify or delete any existing tank rows.

### 2. Hatches table: frozen as legacy

| Change | Before | After |
|---|---|---|
| Insert policy | `hatches_authenticated_insert` (any authenticated user) | `Admins can insert hatches` (admin-only) |
| Update policy | `hatches_authenticated_update` (any authenticated user) | `Admins can update hatches` (admin-only) |
| Delete policy | `hatches_authenticated_delete` (any authenticated user) | `Admins can delete hatches` (admin-only) |
| Read policy | `Allow authenticated read` (unchanged) | `Allow authenticated read` (unchanged) |
| Table comment | None | "DEPRECATED: Legacy clutch records. Use hatch_batches for new records. Read-only for workers; admin-only writes." |

Workers can still view legacy hatches, but only admins can create, update, or delete them.

### 3. Hatch_batches: tank link columns

The migration adds two nullable columns to `hatch_batches` **if they don't already exist**:

| Field | Type | Purpose |
|---|---|---|
| `tank_id` | uuid FK → `tanks(id)` ON DELETE SET NULL | Links a batch to a specific tank |
| `tank_label` | text | Cached tank label for display (denormalized) |

The migration checks for existing columns first and only adds them if missing.
It does NOT rename, drop, or retype any existing `hatch_batches` column, and does
NOT change read policies (the website still reads with the service role).

## Documented bank layout

From the business handbook:

| System | Bank Role | Rows | Tanks per Row | Total | Label Range |
|---|---|---|---|---|---|
| A | mated_pair | 4 | 12 | 48 | A1-1 to A4-12 |
| B | mated_pair | 4 | 12 | 48 | B1-1 to B4-12 |
| C | grow_out | 2 | 1 | 2 | C1-1 to C2-1 |
| D | grow_out | 4 | 3 | 12 | D1-1 to D4-3 |
| E | hatch | 3 | 10 | 30 | E1-1 to E3-10 |
| F | grow_out | 3 | 4 | 12 | F1-1 to F3-4 |
| **Total** | | | | **152** | |

## Using the seed file

**File:** `supabase/seed/phase3_tank_layout.sql` (NOT a migration, NOT applied automatically)

This file inserts placeholder tank rows for the documented layout above. It sets:
- `system`, `row_no`, `tank_no`, `label`, `bank_role`
- `name = label`
- `status = 'active'`
- All other fields null

**IMPORTANT:** The seed is derived ONLY from the documented handbook layout.
It MUST be reviewed against the actual tank room before running.

**Steps to use the seed:**
1. Run `supabase/sql/phase3_reconcile_report.sql` to see gaps and conflicts
2. Review the seed against the physical tank room
3. If it matches reality, run the seed in Supabase SQL Editor
4. The seed uses `ON CONFLICT (label) DO NOTHING`, so it won't overwrite existing tanks

## Using the reconcile report

**File:** `supabase/sql/phase3_reconcile_report.sql` (READ-ONLY, changes nothing)

This file runs SELECT-only queries that compare:
- Existing tank rows in the database
- The documented bank layout from the handbook

**Reports:**
1. Existing tanks whose names DON'T match the dashed pattern
2. Duplicate labels (should never happen after migration)
3. Documented layout labels that have NO corresponding tank row (gaps)
4. Existing tanks with labels that DON'T match documented layout (extras)
5. Summary statistics (total tanks, labels, systems, roles)

**Usage:**
- Run this in Supabase SQL Editor before applying the seed
- Review each report section
- Decide which gaps to fill and which extras to keep or fix
- The seed file will only create missing tanks (ON CONFLICT DO NOTHING)

## Manual steps (Supabase dashboard)

**Prerequisites:**
- [ ] Phase 0 security lockdown applied (or reviewed for conflicts)
- [ ] Backup the `tanks`, `hatches`, and `hatch_batches` tables

**Steps:**
1. **Run the reconcile report:** `supabase/sql/phase3_reconcile_report.sql`
   - Review Report 1: non-standard tank names (decide if they need labels)
   - Review Report 3: missing documented labels (gaps to fill)
   - Review Report 4: labels not in documented layout (decide if they're extras or errors)
   - Note: The migration will auto-backfill labels for existing names matching the pattern

2. **Apply the migration:** `supabase/migrations/20260928174005_phase3_records.sql`
   - Copy/paste into Supabase SQL Editor
   - Click "Run"
   - Check the output for the NOTICE line: "Backfilling labels for N existing tank(s)..."
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

   -- Check hatch_batches columns
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'hatch_batches'
     AND column_name IN ('tank_id', 'tank_label');
   ```

4. **Optionally run the seed:** `supabase/seed/phase3_tank_layout.sql`
   - ONLY if you've reviewed it against the physical tank room
   - This creates placeholder rows for the documented layout
   - Uses ON CONFLICT (label) DO NOTHING (won't overwrite existing)

5. **Deploy the app:** Push and deploy the updated code
   - Admins see the new Tanks page under Admin → Tanks
   - Admins can set labels and bank roles for existing tanks
   - Workers see deprecation notices on legacy hatches

## Test plan (after applying)

### 1. Migration applied successfully
- [ ] No errors in SQL Editor
- [ ] NOTICE output shows "Backfilling labels for N existing tank(s)..."
- [ ] New columns exist on `tanks` (see verification queries above)
- [ ] Trigger `sync_tank_label_trigger` exists
- [ ] Hatches policies changed to admin-only writes
- [ ] Hatch_batches has `tank_id` and `tank_label` columns

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

**Test 3: Reject mismatch**
```sql
INSERT INTO tanks (name, label, system, row_no, tank_no, status)
VALUES ('Test Tank 3', 'C1-1', 'D', 1, 1, 'active');
-- Expected: ERROR - "Label 'C1-1' does not match system/row/tank components (expected 'D1-1')"
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

**Note:** If the seed file was run, the rollback will NOT delete the placeholder
tanks created by the seed. You'll need to manually delete those rows if desired.

## What NOT to do

- ❌ Do NOT apply this migration without reviewing the reconcile report first
- ❌ Do NOT run the seed file without verifying it against the physical tank room
- ❌ Do NOT rename, drop, or retype any existing `hatch_batches` column
- ❌ Do NOT change `hatch_batches` read policies (the website depends on them)
- ❌ Do NOT delete or modify existing tank rows (the migration only adds columns)
- ❌ Do NOT hardcode any tank, hatch, or count data (leave unknowns null)

## What the migration auto-backfills

The migration automatically sets the new label fields for existing tank rows whose
`name` already exactly matches the dashed pattern `^[A-Z][0-9]+-[0-9]+$`.

For example, if you have a tank with `name = 'B3-10'`, the migration will:
- Set `label = 'B3-10'`
- Parse and set `system = 'B'`, `row_no = 3`, `tank_no = 10`
- Leave `bank_role` null (you can set it manually later)

It does NOT:
- Modify `name` or any other existing column
- Delete or rename any tank
- Change tanks whose names don't match the pattern
- Invent or guess data

The NOTICE output tells you how many rows were backfilled.

## Known limitations

1. **No automatic tank_label sync on hatch_batches:** When you assign a `tank_id`
   to a `hatch_batches` row, you must manually set `tank_label` if you want it
   cached. A future migration could add a trigger for this.

2. **No validation of bank_role against documented layout:** The migration allows
   any tank to have any bank_role. It's up to the admin to set roles correctly.

3. **No automatic detection of label changes:** If you update a tank's label,
   you must ensure it still matches the documented layout (if applicable).

## Questions?

See the reconcile report and seed file comments for more details, or ask in #becapp-dev.
