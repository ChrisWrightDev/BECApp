-- BEC Aquaculture Management System Database Schema
-- This schema should be run in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles enum
CREATE TYPE user_role AS ENUM ('admin', 'worker');

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  firstname VARCHAR(255),
  lastname VARCHAR(255),
  role user_role DEFAULT 'worker' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task status enum
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped', 'cancelled');

-- Task time window enum
CREATE TYPE time_window AS ENUM ('morning', 'midday', 'afternoon', 'evening');

-- Template type enum
CREATE TYPE template_type AS ENUM ('lifecycle', 'recurring_interval', 'recurring_daily');

-- Project status enum
CREATE TYPE project_status AS ENUM ('active', 'paused', 'completed', 'cancelled');

-- Templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type template_type NOT NULL,
  interval_days INTEGER, -- For recurring_interval type
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Phases table
CREATE TABLE phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  duration_days INTEGER, -- Auto-advance after N days (null = manual)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phase tasks table (tasks within a phase template)
CREATE TABLE phase_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  time_window time_window,
  scheduled_time TIME, -- Optional specific time
  order_index INTEGER NOT NULL,
  requires_notes BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_id UUID NOT NULL REFERENCES templates(id),
  current_phase_id UUID REFERENCES phases(id),
  tank_id UUID REFERENCES tanks(id),
  status project_status DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table (generated daily tasks)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_task_id UUID REFERENCES phase_tasks(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status task_status DEFAULT 'pending',
  time_window time_window,
  scheduled_time TIME,
  due_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  completion_notes TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tanks table
CREATE TABLE tanks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  capacity_gallons DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mated pairs table
CREATE TABLE mated_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tank_id UUID REFERENCES tanks(id),
  male_species VARCHAR(255),
  female_species VARCHAR(255),
  paired_date DATE,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hatches table
CREATE TABLE hatches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id UUID NOT NULL REFERENCES mated_pairs(id) ON DELETE CASCADE,
  hatch_date DATE NOT NULL,
  quantity INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project history table (for tracking phase changes)
CREATE TABLE project_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES phases(id),
  action VARCHAR(100) NOT NULL, -- 'phase_started', 'phase_completed', 'status_changed', etc.
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_projects_template_id ON projects(template_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_phases_template_id ON phases(template_id);
CREATE INDEX idx_phase_tasks_phase_id ON phase_tasks(phase_id);
CREATE INDEX idx_project_history_project_id ON project_history(project_id);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mated_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_history ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on your security requirements)
-- Function to check if user is admin (bypasses RLS to prevent recursion)
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

-- Profiles policies: users can read their own profile, admins can read all
-- Note: Using a simpler approach - all authenticated users can read profiles
-- (Profiles aren't highly sensitive, and this avoids recursion issues)
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Authenticated users can read profiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
-- Allow authenticated users to read all data
CREATE POLICY "Allow authenticated read" ON templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON phases FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON phase_tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON tanks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON mated_pairs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON hatches FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON project_history FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert/update/delete (adjust based on role requirements)
-- For now, allowing all authenticated users - you should refine these based on admin/worker roles
CREATE POLICY "Allow authenticated insert" ON templates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON templates FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON templates FOR DELETE USING (auth.role() = 'authenticated');

-- Phases policies
CREATE POLICY "phases_authenticated_insert" ON phases FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "phases_authenticated_update" ON phases FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "phases_authenticated_delete" ON phases FOR DELETE USING (auth.role() = 'authenticated');

-- Phase tasks policies
CREATE POLICY "phase_tasks_authenticated_insert" ON phase_tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "phase_tasks_authenticated_update" ON phase_tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "phase_tasks_authenticated_delete" ON phase_tasks FOR DELETE USING (auth.role() = 'authenticated');

-- Projects policies
CREATE POLICY "projects_authenticated_insert" ON projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "projects_authenticated_update" ON projects FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "projects_authenticated_delete" ON projects FOR DELETE USING (auth.role() = 'authenticated');

-- Tasks policies
CREATE POLICY "tasks_authenticated_insert" ON tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "tasks_authenticated_update" ON tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "tasks_authenticated_delete" ON tasks FOR DELETE USING (auth.role() = 'authenticated');

-- Tanks policies
CREATE POLICY "tanks_authenticated_insert" ON tanks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "tanks_authenticated_update" ON tanks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "tanks_authenticated_delete" ON tanks FOR DELETE USING (auth.role() = 'authenticated');

-- Mated pairs policies
CREATE POLICY "mated_pairs_authenticated_insert" ON mated_pairs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "mated_pairs_authenticated_update" ON mated_pairs FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "mated_pairs_authenticated_delete" ON mated_pairs FOR DELETE USING (auth.role() = 'authenticated');

-- Hatches policies
CREATE POLICY "hatches_authenticated_insert" ON hatches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "hatches_authenticated_update" ON hatches FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "hatches_authenticated_delete" ON hatches FOR DELETE USING (auth.role() = 'authenticated');

-- Project history policies
CREATE POLICY "project_history_authenticated_insert" ON project_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "project_history_authenticated_update" ON project_history FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "project_history_authenticated_delete" ON project_history FOR DELETE USING (auth.role() = 'authenticated');

-- In production, you'll want more granular role-based policies

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

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

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_phases_updated_at BEFORE UPDATE ON phases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_phase_tasks_updated_at BEFORE UPDATE ON phase_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tanks_updated_at BEFORE UPDATE ON tanks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mated_pairs_updated_at BEFORE UPDATE ON mated_pairs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hatches_updated_at BEFORE UPDATE ON hatches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

