-- Create waiver_signatures table
CREATE TABLE IF NOT EXISTS public.waiver_signatures (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE, -- Null means platform-wide waiver
    agreed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Ensure a user can only sign a specific context once
    UNIQUE(user_id, facility_id)
);

-- RLS Policies
ALTER TABLE public.waiver_signatures ENABLE ROW LEVEL SECURITY;

-- Users can view their own signatures
CREATE POLICY "Users can view own waiver signatures"
ON public.waiver_signatures
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view signatures for their facility
CREATE POLICY "Facility admins can view facility signatures"
ON public.waiver_signatures
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.facility_id = waiver_signatures.facility_id
    )
);

-- Master Admins can view all signatures
CREATE POLICY "Master admins can view all signatures"
ON public.waiver_signatures
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.system_role = 'super_admin' OR profiles.role = 'master_admin')
    )
);

-- Users can insert their own signatures
CREATE POLICY "Users can sign waivers"
ON public.waiver_signatures
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Deny updates/deletes explicitly
CREATE POLICY "Deny updates to waiver signatures" ON public.waiver_signatures FOR UPDATE USING (false);
CREATE POLICY "Deny deletes to waiver signatures" ON public.waiver_signatures FOR DELETE USING (false);
