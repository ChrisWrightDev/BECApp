# Profiles Table Migration Guide

## Overview
A `profiles` table has been added to store user profile information (firstname, lastname, role) separate from the auth.users table. This enables proper role-based access control.

## Database Migration

### Step 1: Run the Schema Updates
Execute the following SQL in your Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  firstname VARCHAR(255),
  lastname VARCHAR(255),
  role user_role DEFAULT 'worker' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_profiles_role ON profiles(role);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, firstname, lastname, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'firstname', ''),
    COALESCE(NEW.raw_user_meta_data->>'lastname', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'worker')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 2: Migrate Existing Users
If you have existing users, create profiles for them:

```sql
-- Create profiles for existing users
INSERT INTO profiles (id, firstname, lastname, role)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'firstname', ''),
  COALESCE(raw_user_meta_data->>'lastname', ''),
  COALESCE((raw_user_meta_data->>'role')::user_role, 'worker')
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles);
```

### Step 3: Set Admin Users
To set specific users as admins:

```sql
-- Update a user to admin role
UPDATE profiles
SET role = 'admin'
WHERE id = 'USER_UUID_HERE';
```

## Application Changes

The application has been updated to:

1. **Fetch profile data** on login and session refresh
2. **Use profile role** for access control (instead of user_metadata)
3. **Display user names** from profiles in the UI
4. **Allow admins to edit** user profiles (firstname, lastname, role)

## Role-Based Access Control

- **Admin**: Can access admin pages, manage templates, users, and view analytics
- **Worker**: Can access dashboard, tasks, projects, and mated pairs

The `admin` middleware checks the user's role from the profiles table to enforce access control.

## Notes

- New users will automatically get a profile created via the trigger
- The role defaults to 'worker' for new users
- Users can update their own firstname and lastname
- Only admins can change roles (and cannot change their own role)

## Fixing RLS Recursion Issue

If you encounter the error "infinite recursion detected in policy for relation 'profiles'", run the SQL in `FIX_PROFILES_RLS_RECURSION.sql` in your Supabase SQL Editor. This fixes the RLS policies to use a security definer function that bypasses RLS when checking admin status, preventing the infinite recursion.

