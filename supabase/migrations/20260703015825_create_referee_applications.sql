-- Create referee_applications table
CREATE TABLE IF NOT EXISTS public.referee_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    experience_summary TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.referee_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view their own referee applications" 
    ON public.referee_applications 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Users can insert their own applications
CREATE POLICY "Users can insert their own referee applications" 
    ON public.referee_applications 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Master Admins can view all applications
CREATE POLICY "Master Admins can view all referee applications" 
    ON public.referee_applications 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'master_admin' OR profiles.system_role = 'super_admin')
        )
    );

-- Master Admins can update applications
CREATE POLICY "Master Admins can update referee applications" 
    ON public.referee_applications 
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'master_admin' OR profiles.system_role = 'super_admin')
        )
    );

-- Function and Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.referee_applications
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
