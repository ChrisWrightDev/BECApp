-- Migration: Add tank_id to projects table
-- Run this in your Supabase SQL Editor to update existing databases

-- Add tank_id column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tank_id UUID REFERENCES tanks(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_tank_id ON projects(tank_id);

