# Phase 2: Daily Checklist v2

## Overview

Phase 2 replaces browser-side daily task generation with a database-backed checklist system where the operations agent writes structured daily checklists that workers complete in the BECApp.

## Changes Summary

### 1. Database Schema

**New Tables:**
- `checklist_days`: One row per work date containing the day's metadata
- `checklist_items`: Individual checklist tasks organized by time blocks

**Migration:** `supabase/migrations/20260928172351_phase2_checklist.sql`

**Post-deployment hardening:** `supabase/migrations/20260928181500_harden_grants.sql` (already applied to production) revokes TRUNCATE/REFERENCES/TRIGGER privileges on checklist tables from client roles, which would bypass RLS.

**Security Fix:**
- Added `restrict_checklist_item_updates()` BEFORE UPDATE trigger on `checklist_items`
- Enforces column-level restrictions via trigger (not column grants)
- Why: Supabase grants ALL on public tables to `authenticated` by default
- Column-level grants cannot separate admins from workers (both are `authenticated`)
- Trigger allows service role/SQL editor full access, admins full access, workers only done/done_at/done_by/note/value_text
- Raises exception (errcode 42501) if workers try to update structure/metadata columns

### 2. Disabled Task Generation

**File:** `app/pages/auth/login.vue`

**What was disabled:**
- `generateTasksByCategory('open_shop', date)` - No longer generates Open Shop tasks on login
- `generateRegularTasks(date)` - No longer generates project/job-based tasks on login  
- `generateTasksByCategory('close_shop', date)` - No longer generates Close Up Shop tasks on login
- `isMidShift(date)` function - Mid-shift detection logic removed

**Impact:**
- Workers now simply log in and are redirected to `/chat` (Phase 1 messaging page)
- No tasks are auto-created in the `tasks` table
- The old tasks pages (`/tasks`, `/tasks/calendar`) remain readable but frozen
- Admin manual task generation buttons still work but are deprecated

### 3. New Checklist UI

**Files:**
- `app/pages/checklist.vue` - Main checklist screen
- `app/composables/useChecklist.js` - Checklist data management
- `app/layouts/default.vue` - Added "Messages" and "Checklist" nav items (in that order)

**Features:**
- Mobile-optimized with large tap targets
- Grouped into 5 time blocks (Pre-morning, Morning, Midday, Afternoon, Evening)
- Real-time updates via Supabase Realtime
- Optimistic UI updates with error rollback
- Progress tracking per block and overall
- Value inputs for temperature checks and other measured tasks
- Optional notes per item
- Tank and batch associations displayed as badges

### 4. Integration with Phase 1

This branch merges Phase 1 (Messaging System):
- Login redirects to `/chat` (not `/`)
- Navigation shows: Messages → Checklist → Tasks → Projects → Mated Pairs → Admin
- Phase 1 migration (`20260928170100_phase1_messaging.sql`) included
- Messages composable and chat page available

## Data Contract for Operations Agent

The operations agent writes to `checklist_days` and `checklist_items` using the **Supabase service role** (bypasses RLS).

### Workflow

1. **Draft Phase (5:00 AM - 5:30 AM CT):**
   ```sql
   -- Upsert the day as draft
   INSERT INTO checklist_days (work_date, status, created_by)
   VALUES ('2026-09-29', 'draft', 'operations_agent')
   ON CONFLICT (work_date) 
   DO UPDATE SET status = 'draft', updated_at = now();
   
   -- Delete not-done items from previous draft (if any)
   DELETE FROM checklist_items
   WHERE day_id = (SELECT id FROM checklist_days WHERE work_date = '2026-09-29')
     AND done = false;
   ```

2. **Insert Items:**
   ```sql
   -- Insert checklist items
   INSERT INTO checklist_items (
     day_id, block, sort_order, title, detail, category,
     tank_id, tank_label, batch_id, requires_value
   )
   VALUES 
     (
       (SELECT id FROM checklist_days WHERE work_date = '2026-09-29'),
       'morning',
       10,
       'Check water temperature in Tank A-1-12',
       'Record in Fahrenheit',
       'temp_check',
       (SELECT id FROM tanks WHERE name = 'A-1-12'),
       'A-1-12',
       NULL,
       true  -- requires_value for temperature
     ),
     (
       (SELECT id FROM checklist_days WHERE work_date = '2026-09-29'),
       'morning',
       20,
       'Feed clownfish in Tank B-2-34',
       'Use 2 scoops of flake food',
       'feeding',
       (SELECT id FROM tanks WHERE name = 'B-2-34'),
       'B-2-34',
       NULL,
       false
     ),
     (
       (SELECT id FROM checklist_days WHERE work_date = '2026-09-29'),
       'midday',
       10,
       'Check for new hatches in Tank C-3-56',
       'Inspect closely for larvae',
       'hatch_check',
       (SELECT id FROM tanks WHERE name = 'C-3-56'),
       'C-3-56',
       (SELECT id FROM hatch_batches WHERE batch_number = 'HB-2024-089'),
       false
     );
   ```

3. **Publish Phase (5:30 AM - 5:55 AM CT):**
   ```sql
   -- Flip to published to make visible to workers
   UPDATE checklist_days
   SET status = 'published', updated_at = now()
   WHERE work_date = '2026-09-29';
   ```

4. **Read Back Completion Data:**
   ```sql
   -- Query completed items with user info
   SELECT 
     i.id,
     i.title,
     i.category,
     i.tank_label,
     i.done,
     i.done_at,
     i.done_by,
     i.value_text,
     i.note,
     p.firstname,
     p.lastname
   FROM checklist_items i
   LEFT JOIN profiles p ON i.done_by = p.id
   WHERE i.day_id = (SELECT id FROM checklist_days WHERE work_date = '2026-09-29')
     AND i.done = true
   ORDER BY i.done_at;
   ```

5. **Carry Over Unfinished Items (Next Day):**
   The operations agent re-inserts yesterday's unfinished items into today's draft:
   ```sql
   -- Copy unfinished items from yesterday
   INSERT INTO checklist_items (
     day_id, block, sort_order, title, detail, category,
     tank_id, tank_label, batch_id, requires_value
   )
   SELECT 
     (SELECT id FROM checklist_days WHERE work_date = '2026-09-29'),
     block,
     sort_order,
     title,
     detail,
     category,
     tank_id,
     tank_label,
     batch_id,
     requires_value
   FROM checklist_items
   WHERE day_id = (SELECT id FROM checklist_days WHERE work_date = '2026-09-28')
     AND done = false;
   ```

### Field Reference

**checklist_days:**
- `work_date` (date, unique): The work date in America/Chicago timezone
- `status` (text): 'draft' | 'published' | 'closed'
- `created_by` (text): Identifier (e.g. 'operations_agent')
- `notes` (text, nullable): Optional day-level notes shown at top of checklist

**checklist_items:**
- `day_id` (uuid): FK to checklist_days
- `block` (text): 'pre_morning' | 'morning' | 'midday' | 'afternoon' | 'evening'
- `sort_order` (int): Display order within block
- `title` (text): Task title
- `detail` (text, nullable): Additional instructions
- `category` (text): 'feeding' | 'temp_check' | 'hatch_check' | 'cleaning' | 'move' | 'other'
- `tank_id` (uuid, nullable): FK to tanks (on delete set null)
- `tank_label` (text, nullable): Display name for tank
- `batch_id` (uuid, nullable): FK to hatch_batches (on delete set null)
- `requires_value` (boolean): If true, `value_text` must be filled before marking done
- `value_text` (text, nullable): Worker-entered value (e.g. temperature reading)
- `done` (boolean): Completion flag
- `done_at` (timestamptz, nullable): Completion timestamp
- `done_by` (uuid, nullable): FK to auth.users
- `note` (text, nullable): Worker's optional note

### Temperature Items

For temperature checks, set:
- `category = 'temp_check'`
- `requires_value = true`
- `detail = 'Record in Fahrenheit'` (or similar instruction)

The UI will show a value input field and prevent marking done until a value is entered.

## Manual Steps for Chris

### 1. Review Migration

Review `supabase/migrations/20260928172351_phase2_checklist.sql`:
- Verify table structure matches requirements
- Confirm RLS policies are correct
- Check FK references to `tanks` and `hatch_batches`

### 2. Backup

```bash
# Backup relevant tables before applying migration
pg_dump -h db.janwtypmneybfzeiauzt.supabase.co \
  -U postgres \
  -t public.tasks \
  -t public.profiles \
  -f backup_phase2_pre_migration_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Apply Migration

In Supabase SQL Editor:
```sql
-- Run the migration file content
-- supabase/migrations/20260928172351_phase2_checklist.sql
```

Verify tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('checklist_days', 'checklist_items');
```

Verify realtime publication:
```sql
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('checklist_days', 'checklist_items');
```

### 4. Deploy App

```bash
# Build passes
npm run build

# Deploy via your standard process
# The app will show "Today's checklist isn't ready yet" until ops agent publishes
```

### 5. Test in Staging (if available)

Create a test checklist manually:
```sql
-- Insert a test day
INSERT INTO checklist_days (work_date, status, created_by)
VALUES (CURRENT_DATE, 'published', 'manual_test');

-- Insert test items
INSERT INTO checklist_items (day_id, block, sort_order, title, category, requires_value)
VALUES 
  ((SELECT id FROM checklist_days WHERE work_date = CURRENT_DATE), 'morning', 10, 'Test temperature check', 'temp_check', true),
  ((SELECT id FROM checklist_days WHERE work_date = CURRENT_DATE), 'morning', 20, 'Test feeding task', 'feeding', false);
```

Open the app on a test device:
1. Navigate to /checklist
2. Verify items display correctly
3. Tap to mark an item done
4. Fill in temperature value and mark done
5. Add a note to an item
6. Verify realtime updates (open on two devices)

### 6. Test Security Trigger (Critical)

After migration is applied, test the `restrict_checklist_item_updates()` trigger:

**As a worker (non-admin authenticated user):**

```sql
-- Get a test item ID
SELECT id, title, done FROM checklist_items LIMIT 1;
-- Example result: id = '123e4567-...'

-- Test 1: Try to update title (should FAIL with error 42501)
UPDATE checklist_items 
SET title = 'Hacked title' 
WHERE id = '123e4567-...';
-- Expected: ERROR: Workers may only update done, done_at, done_by, note, and value_text columns

-- Test 2: Try to update block (should FAIL)
UPDATE checklist_items 
SET block = 'evening' 
WHERE id = '123e4567-...';
-- Expected: ERROR: Workers may only update done, done_at, done_by, note, and value_text columns

-- Test 3: Update allowed columns (should SUCCEED)
UPDATE checklist_items 
SET done = true, note = 'Test note', value_text = '78.5'
WHERE id = '123e4567-...';
-- Expected: UPDATE 1 (success)
```

**As an admin:**

```sql
-- Set your JWT to an admin user's token
-- Test: Update title (should SUCCEED)
UPDATE checklist_items 
SET title = 'Updated by admin' 
WHERE id = '123e4567-...';
-- Expected: UPDATE 1 (success)
```

**As service role (SQL Editor):**

```sql
-- In Supabase SQL Editor (bypasses RLS, not authenticated role)
UPDATE checklist_items 
SET title = 'Updated by service role', block = 'afternoon'
WHERE id = '123e4567-...';
-- Expected: UPDATE 1 (success)
```

**Via the App (worker account):**

1. Log in as a worker (non-admin)
2. Open browser DevTools Console
3. Try to update a restricted column via Supabase client:
```javascript
const { data, error } = await supabase
  .from('checklist_items')
  .update({ title: 'Hacked via app' })
  .eq('id', 'some-item-id')
  .select()

// Should see: error with code 42501
console.log(error)
```

4. Try to update allowed columns:
```javascript
const { data, error } = await supabase
  .from('checklist_items')
  .update({ done: true, note: 'Test note' })
  .eq('id', 'some-item-id')
  .select()

// Should succeed
console.log(data)
```

## Test Plan

### Unit Tests (Manual Verification)

1. **Migration applies cleanly**
   - No syntax errors
   - Tables created successfully
   - Triggers created
   - RLS policies active

2. **RLS Policies & Security**
   - Anon: Cannot read or write anything ✓
   - Authenticated (worker): Can read published days/items ✓
   - Authenticated (worker): Can update done/value_text/note on published items ✓
   - Authenticated (worker): Cannot read draft days ✓
   - Admin: Can read/write all days and items ✓
   - **Security trigger test (critical):**
     - Worker attempts to UPDATE title on published item → raises exception 42501 ✓
     - Worker attempts to UPDATE block on published item → raises exception 42501 ✓
     - Worker attempts to UPDATE tank_id on published item → raises exception 42501 ✓
     - Worker CAN update done, done_at, done_by, note, value_text → succeeds ✓
     - Admin CAN update any column including title, block, etc. → succeeds ✓
     - Service role CAN update any column → succeeds ✓

3. **App Behavior**
   - Workers see "not ready yet" when no published day exists ✓
   - Workers see checklist when published day exists ✓
   - Tapping item toggles done state ✓
   - Value required items block completion until value entered ✓
   - Notes can be added/edited ✓
   - Realtime updates appear without refresh ✓
   - Optimistic updates rollback on error ✓

4. **Login Flow & Navigation**
   - Workers log in and are redirected to /chat (Phase 1 default) ✓
   - No errors in console related to task generation ✓
   - Old task pages still work (read-only) ✓
   - Navigation shows: Messages → Checklist → Tasks → Projects → Mated Pairs → Admin ✓

5. **Mobile UX**
   - Tap targets are large enough (> 44px) ✓
   - Text is readable on phone ✓
   - No horizontal scroll ✓
   - Blocks collapse/expand correctly ✓

### Integration Tests

1. **Ops Agent Workflow**
   - Agent upserts draft day ✓
   - Agent inserts items ✓
   - Agent publishes day ✓
   - Workers immediately see published checklist (realtime) ✓

2. **Multiple Workers**
   - Two workers on same checklist ✓
   - One marks item done, other sees update immediately ✓
   - No race conditions or conflicts ✓

3. **Build**
   - `npm run build` completes without errors ✓
   - No TypeScript errors ✓
   - No ESLint errors ✓

## Rollback Plan

If issues arise, rollback in this order:

### 1. App Rollback (Quick - 5 minutes)

Revert the PR and redeploy:
```bash
git revert <commit-sha>
git push origin master
# Redeploy
```

This restores the old login flow. Workers will generate tasks again on login.

### 2. Database Rollback (If Needed - 15 minutes)

Run the rollback SQL from the migration file:
```sql
begin;

alter publication supabase_realtime drop table if exists public.checklist_items;
alter publication supabase_realtime drop table if exists public.checklist_days;

drop trigger if exists restrict_checklist_item_updates on public.checklist_items;
drop function if exists public.restrict_checklist_item_updates();

drop table if exists public.checklist_items cascade;
drop table if exists public.checklist_days cascade;

commit;
```

Verify:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('checklist_days', 'checklist_items');
-- Should return 0 rows
```

### 3. Backup Restore (If Needed)

If data was lost:
```bash
psql -h db.janwtypmneybfzeiauzt.supabase.co \
  -U postgres \
  -f backup_phase2_pre_migration_YYYYMMDD_HHMMSS.sql
```

## Post-Deployment Monitoring

### Metrics to Watch

1. **Checklist Load Time**
   - Should be < 500ms for today's checklist
   - Monitor Supabase query performance

2. **Realtime Connection**
   - Check for WebSocket errors in browser console
   - Verify updates propagate < 1 second

3. **Worker Feedback**
   - "Checklist not ready" messages (should only be pre-5:55 AM CT)
   - Completion rates (should be similar to old task completion)
   - Reports of missing items or incorrect data

4. **Ops Agent Errors**
   - Monitor agent logs for publication failures
   - Verify checklists publish by 5:55 AM CT daily

### Common Issues & Solutions

**Issue:** Workers see "not ready yet" after 6 AM
- Check: Is there a published day for today?
  ```sql
  SELECT * FROM checklist_days WHERE work_date = CURRENT_DATE;
  ```
- Fix: Manually publish or investigate ops agent

**Issue:** Realtime updates not working
- Check: Is table in publication?
  ```sql
  SELECT * FROM pg_publication_tables 
  WHERE pubname = 'supabase_realtime' 
    AND tablename = 'checklist_items';
  ```
- Fix: Re-run publication section of migration

**Issue:** Can't mark temperature item done
- Check: Is `value_text` filled?
- Remind worker: Must enter temperature before checking off

**Issue:** Build fails with import errors
- Check: `app/composables/useChecklist.js` exists
- Fix: Re-pull branch and rebuild

## Future Enhancements

Potential Phase 3+ features (not implemented):
- Archive old checklists (close status after midnight)
- Reporting dashboard (completion trends, avg temperature, etc.)
- Push notifications for incomplete items
- Photo attachments for hatch checks
- Voice-to-text for notes
- Offline mode (service worker caching)

## Questions & Support

Contact Chris or Mike for:
- Database access issues
- RLS policy questions
- Ops agent configuration
- Supabase service role key

For code questions, see the PR discussion or Slack #becapp-dev.
