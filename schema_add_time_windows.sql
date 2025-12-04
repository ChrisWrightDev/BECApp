-- Add "First" and "Last" time windows to the time_window enum
-- This migration should be run in your Supabase SQL editor

-- Step 1: Add new values to the time_window enum
-- Note: PostgreSQL doesn't support adding values to an enum directly, so we need to:
-- 1. Create a new enum with all values
-- 2. Update the column to use the new enum
-- 3. Drop the old enum
-- 4. Rename the new enum

-- Create new enum with all values
CREATE TYPE time_window_new AS ENUM ('first', 'morning', 'midday', 'afternoon', 'evening', 'last');

-- Update columns to use new enum
ALTER TABLE phase_tasks ALTER COLUMN time_window TYPE time_window_new USING time_window::text::time_window_new;
ALTER TABLE job_tasks ALTER COLUMN time_window TYPE time_window_new USING time_window::text::time_window_new;
ALTER TABLE tasks ALTER COLUMN time_window TYPE time_window_new USING time_window::text::time_window_new;

-- Drop old enum
DROP TYPE time_window;

-- Rename new enum to original name
ALTER TYPE time_window_new RENAME TO time_window;

