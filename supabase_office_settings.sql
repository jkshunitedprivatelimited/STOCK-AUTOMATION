
CREATE TABLE IF NOT EXISTS office_settings (
  id TEXT PRIMARY KEY DEFAULT 'HQ',
  branch_name TEXT NOT NULL DEFAULT 'TV-1',
  latitude NUMERIC,
  longitude NUMERIC,
  radius_meters INTEGER DEFAULT 100,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default if empty
INSERT INTO office_settings (id, latitude, longitude, radius_meters)
VALUES ('HQ', 17.385044, 78.486671, 100)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE office_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read (or authenticated read)
CREATE POLICY "Allow authenticated read on office_settings" ON office_settings FOR SELECT USING (true);

-- Allow central update
CREATE POLICY "Allow central update on office_settings" ON office_settings FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'central' OR profiles.franchise_id = 'CENTRAL')
  )
);

