-- Fix RLS Policies for Phases and Other Tables
-- Run this in your Supabase SQL Editor to add missing INSERT/UPDATE/DELETE policies

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

