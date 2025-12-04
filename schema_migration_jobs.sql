-- Migration: Add Jobs System and Remove Daily/Interval from Projects
-- This migration should be run in your Supabase SQL editor

-- Step 1: Create Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  interval_days INTEGER NOT NULL, -- How often to perform this job (e.g., 1 for daily, 7 for weekly)
  tank_id UUID REFERENCES tanks(id),
  status VARCHAR(50) DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 1a: Add tank_id column if jobs table already exists (for existing installations)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'tank_id'
  ) THEN
    ALTER TABLE jobs 
      ADD COLUMN tank_id UUID;
    
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_tank_id_fkey 
      FOREIGN KEY (tank_id) REFERENCES tanks(id);
  END IF;
END $$;

-- Step 2: Create Job Tasks table (tasks associated with a job)
CREATE TABLE IF NOT EXISTS job_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  time_window time_window,
  scheduled_time TIME, -- Optional specific time
  order_index INTEGER NOT NULL,
  requires_notes BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Update tasks table to support both projects and jobs
-- First, make project_id nullable and add job_id
ALTER TABLE tasks 
  ALTER COLUMN project_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS job_task_id UUID REFERENCES job_tasks(id);

-- Add constraint to ensure task has either project_id or job_id
ALTER TABLE tasks 
  ADD CONSTRAINT tasks_source_check 
  CHECK (
    (project_id IS NOT NULL AND job_id IS NULL) OR 
    (project_id IS NULL AND job_id IS NOT NULL)
  );

-- Step 4: Update template_type enum to remove recurring types
-- Note: This requires dropping and recreating the enum, which may affect existing data
-- First, update any existing templates with recurring types to 'lifecycle'
UPDATE templates SET type = 'lifecycle' WHERE type IN ('recurring_interval', 'recurring_daily');

-- Drop the old enum and create a new one with only 'lifecycle'
-- Note: This is a destructive operation. Make sure to backup your data first.
-- We'll need to drop dependent objects first
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_type_check;
DROP TYPE IF EXISTS template_type CASCADE;

-- Recreate the enum with only lifecycle
CREATE TYPE template_type AS ENUM ('lifecycle');

-- Add the constraint back
ALTER TABLE templates 
  ADD COLUMN type_new template_type DEFAULT 'lifecycle';
UPDATE templates SET type_new = 'lifecycle'::template_type;
ALTER TABLE templates DROP COLUMN IF EXISTS type;
ALTER TABLE templates RENAME COLUMN type_new TO type;
ALTER TABLE templates ALTER COLUMN type SET NOT NULL;

-- Step 5: Remove interval_days from templates (no longer needed)
ALTER TABLE templates DROP COLUMN IF EXISTS interval_days;

-- Step 6: Create indexes for jobs
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_tank_id ON jobs(tank_id);
CREATE INDEX IF NOT EXISTS idx_job_tasks_job_id ON job_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_tasks_job_id ON tasks(job_id);

-- Step 7: Enable RLS on new tables
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_tasks ENABLE ROW LEVEL SECURITY;

-- Step 8: Add RLS policies for jobs
CREATE POLICY "Allow authenticated read" ON jobs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON jobs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON jobs FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON jobs FOR DELETE USING (auth.role() = 'authenticated');

-- Step 9: Add RLS policies for job_tasks
CREATE POLICY "Allow authenticated read" ON job_tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON job_tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON job_tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON job_tasks FOR DELETE USING (auth.role() = 'authenticated');

-- Step 10: Add triggers for updated_at
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_tasks_updated_at BEFORE UPDATE ON job_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

