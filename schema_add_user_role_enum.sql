-- Migration: Add user_role enum type if it doesn't exist
-- This migration should be run in your Supabase SQL editor

-- Check if the enum type exists, and create it if it doesn't
DO $$ 
BEGIN
    -- Check if the enum type already exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        -- Create the enum type
        CREATE TYPE user_role AS ENUM ('admin', 'worker');
        RAISE NOTICE 'Created user_role enum type';
    ELSE
        RAISE NOTICE 'user_role enum type already exists';
    END IF;
END $$;

-- Verification (optional - uncomment to check)
-- SELECT enum_range(NULL::user_role);

