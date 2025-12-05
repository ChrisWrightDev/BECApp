-- Migration: Add requires_sequential field to phases and jobs
-- This migration should be run in your Supabase SQL editor

-- Add requires_sequential to phases table
ALTER TABLE phases 
  ADD COLUMN IF NOT EXISTS requires_sequential BOOLEAN DEFAULT false;

-- Add requires_sequential to jobs table
ALTER TABLE jobs 
  ADD COLUMN IF NOT EXISTS requires_sequential BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN phases.requires_sequential IS 'If true, tasks in this phase must be completed in order';
COMMENT ON COLUMN jobs.requires_sequential IS 'If true, tasks in this job must be completed in order';

