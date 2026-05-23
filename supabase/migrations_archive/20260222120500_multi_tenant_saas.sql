-- 1. Create facilities table
CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Facilities are viewable by everyone." ON facilities
    FOR SELECT USING (true);

-- 2. Create resources table for fields/courts
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resources are viewable by everyone." ON resources
    FOR SELECT USING (true);


-- 3. Update profiles table for multi-tenancy
ALTER TABLE profiles 
ADD COLUMN system_role TEXT DEFAULT 'player',
ADD COLUMN facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL;

-- 4. Update games table for multi-tenancy
ALTER TABLE games
ADD COLUMN facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
ADD COLUMN resource_id UUID REFERENCES resources(id) ON DELETE SET NULL;
