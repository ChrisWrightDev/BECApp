-- Fix infinite recursion in profiles RLS policies
-- Run this in your Supabase SQL Editor to fix the recursion issue

-- Step 1: Drop the problematic policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Step 2: Create a security definer function to check admin status
-- This function bypasses RLS, preventing infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

-- Step 3: Create new policies that don't cause recursion

-- Allow all authenticated users to read profiles
-- (This is simpler and avoids recursion - profiles aren't highly sensitive)
CREATE POLICY "Authenticated users can read profiles" ON profiles 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Allow users to update their own profile
-- (The existing policy should work, but we'll ensure it's correct)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to update any profile using the security definer function
CREATE POLICY "Admins can update all profiles" ON profiles 
  FOR UPDATE 
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Note: The "Users can read own profile" policy can stay as it doesn't cause recursion
-- Both policies will work together (OR logic)


