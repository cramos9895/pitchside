-- Add Time Range to leagues
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS time_range_start TIME,
ADD COLUMN IF NOT EXISTS time_range_end TIME;

-- Create joining table for leagues and resources
CREATE TABLE IF NOT EXISTS league_resources (
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (league_id, resource_id)
);

-- RLS Policies for league_resources
ALTER TABLE league_resources ENABLE ROW LEVEL SECURITY;

-- Super admins and facility admins can do anything
CREATE POLICY "Super and Facility Admins have full access to league_resources"
ON league_resources FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.system_role IN ('super_admin', 'facility_admin')
            OR profiles.role = 'master_admin'
        )
    )
);

-- Public read access so players can see where they are playing
CREATE POLICY "Anyone can view league_resources"
ON league_resources FOR SELECT
USING (true);
