-- Add tank_id column to jobs table if it doesn't exist
-- Run this in your Supabase SQL editor if you're getting the foreign key relationship error

-- Check if column exists and add it if not
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'tank_id'
  ) THEN
    -- Add the column
    ALTER TABLE jobs 
      ADD COLUMN tank_id UUID;
    
    -- Add the foreign key constraint with explicit name
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_tank_id_fkey 
      FOREIGN KEY (tank_id) REFERENCES tanks(id);
    
    -- Add index for performance
    CREATE INDEX IF NOT EXISTS idx_jobs_tank_id ON jobs(tank_id);
    
    RAISE NOTICE 'tank_id column and foreign key constraint added to jobs table';
  ELSE
    RAISE NOTICE 'tank_id column already exists in jobs table';
  END IF;
END $$;

-- Verify the foreign key was created
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'jobs'
  AND kcu.column_name = 'tank_id';


