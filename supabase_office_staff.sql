-- ============================================
-- Office Staff Management & Attendance Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Office Staff Profiles Table
CREATE TABLE IF NOT EXISTS office_staff_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  phone TEXT,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'office_staff',
  office_role TEXT NOT NULL DEFAULT 'General',
  branch TEXT NOT NULL DEFAULT 'TV-1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for profiles
ALTER TABLE office_staff_profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read profiles
CREATE POLICY "Public read access for office_staff_profiles"
  ON office_staff_profiles FOR SELECT
  USING (true);

-- Only central can insert/update/delete profiles (Basic security)
CREATE POLICY "Central all access for office_staff_profiles"
  ON office_staff_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'central' OR profiles.franchise_id = 'CENTRAL')
    )
  );

-- 2. Office Staff Attendance Logs Table
CREATE TABLE IF NOT EXISTS office_staff_attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES office_staff_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ,
  check_in_location JSONB, -- Stores { latitude, longitude }
  check_out_time TIMESTAMPTZ,
  check_out_location JSONB,
  status TEXT NOT NULL DEFAULT 'Checked In', -- e.g., 'Checked In', 'On Break', 'Checked Out'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for logs
ALTER TABLE office_staff_attendance_logs ENABLE ROW LEVEL SECURITY;

-- Staff can read their own logs + Central can read all logs
CREATE POLICY "Staff read own logs, Central read all"
  ON office_staff_attendance_logs FOR SELECT
  USING (
    auth.uid() = staff_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'central' OR profiles.franchise_id = 'CENTRAL')
    )
  );

-- Staff can insert their own logs
CREATE POLICY "Staff insert own logs"
  ON office_staff_attendance_logs FOR INSERT
  WITH CHECK (auth.uid() = staff_id);

-- Staff can update their own logs
CREATE POLICY "Staff update own logs"
  ON office_staff_attendance_logs FOR UPDATE
  USING (auth.uid() = staff_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE office_staff_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE office_staff_attendance_logs;

-- 3. Custom RPCs
-- RPC to firmly delete an Office Staff member from auth.users (cascades automatically to standard tables)
CREATE OR REPLACE FUNCTION delete_office_staff_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We assume that whoever calls this is a central admin (enforce through your apps UI auth checks)
  
  -- Delete the user from auth.users directly. 
  -- Due to ON DELETE CASCADE on office_staff_profiles and office_staff_attendance_logs, 
  -- all related records will be destroyed seamlessly.
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;


-- ============================================
-- 4. Dynamic HQ Location Settings
-- ============================================

CREATE TABLE IF NOT EXISTS office_settings (
  id TEXT PRIMARY KEY DEFAULT 'HQ',
  branch_name TEXT NOT NULL DEFAULT 'TV-1',
  latitude NUMERIC,
  longitude NUMERIC,
  radius_meters INTEGER DEFAULT 100,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default HQ if not exists
INSERT INTO office_settings (id, latitude, longitude, radius_meters)
VALUES ('HQ', 17.385044, 78.486671, 100)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE office_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read (or authenticated read)
CREATE POLICY "Allow read on office_settings" ON office_settings FOR SELECT USING (true);

-- Allow central update
CREATE POLICY "Allow central update on office_settings" ON office_settings FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'central' OR profiles.franchise_id = 'CENTRAL')
  )
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE office_settings;
