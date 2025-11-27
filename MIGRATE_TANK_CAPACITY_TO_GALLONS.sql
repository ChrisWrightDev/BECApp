-- Migration: Change tank capacity from liters to gallons
-- Run this in your Supabase SQL Editor to update existing databases

-- Step 1: Add the new column
ALTER TABLE tanks ADD COLUMN IF NOT EXISTS capacity_gallons DECIMAL(10, 2);

-- Step 2: Convert existing liters to gallons (1 liter = 0.264172 gallons)
-- Update existing capacity_liters values to capacity_gallons
UPDATE tanks 
SET capacity_gallons = capacity_liters * 0.264172 
WHERE capacity_liters IS NOT NULL;

-- Step 3: Drop the old column (uncomment when ready)
-- ALTER TABLE tanks DROP COLUMN capacity_liters;

-- Note: Keep the old column commented out above until you've verified the migration worked correctly.
-- Once verified, you can uncomment the DROP COLUMN statement to remove the old column.

