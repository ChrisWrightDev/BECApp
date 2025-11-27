-- Fix infinite recursion in profiles RLS policies
-- The issue: Admin policies query the profiles table to check if user is admin,
-- which triggers the same policy check, creating infinite recursion.

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Solution 1: Use a security definer function to bypass RLS for admin checks
-- This function can check admin status without triggering RLS recursion
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

-- Solution 2: Use a simpler approach - allow authenticated users to read all profiles
-- (You can restrict this further if needed)
CREATE POLICY "Authenticated users can read profiles" ON profiles 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Allow users to update their own profile
-- (The existing policy should work, but let's recreate it to be sure)
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

-- Alternative simpler approach (if you don't want to use functions):
-- Just allow all authenticated users to read profiles (less secure but simpler)
-- And restrict updates to own profile or admin role via application logic


