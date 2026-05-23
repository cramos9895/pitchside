-- 1. Create Event Check-Ins Table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type_enum') THEN
        CREATE TYPE event_type_enum AS ENUM ('rolling', 'tournament', 'pickup');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.event_check_ins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL,
    event_type event_type_enum NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checked_by UUID NOT NULL REFERENCES auth.users(id),
    UNIQUE(event_id, user_id)
);

-- RLS for event_check_ins
ALTER TABLE public.event_check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can view all check-ins" ON public.event_check_ins;
CREATE POLICY "Hosts can view all check-ins" ON public.event_check_ins
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'host')));

DROP POLICY IF EXISTS "Users can view own check-ins" ON public.event_check_ins;
CREATE POLICY "Users can view own check-ins" ON public.event_check_ins
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Hosts can manage check-ins" ON public.event_check_ins;
CREATE POLICY "Hosts can manage check-ins" ON public.event_check_ins
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'host')));


-- 2. Create Event Identities Table
CREATE TABLE IF NOT EXISTS public.event_identities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL,
    photo_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- RLS for event_identities
ALTER TABLE public.event_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can view event identities" ON public.event_identities;
CREATE POLICY "Hosts can view event identities" ON public.event_identities
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'host')));

DROP POLICY IF EXISTS "Users can view own event identities" ON public.event_identities;
CREATE POLICY "Users can view own event identities" ON public.event_identities
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Hosts can manage event identities" ON public.event_identities;
CREATE POLICY "Hosts can manage event identities" ON public.event_identities
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'host')));


-- 3. Create Storage Bucket for Identities
INSERT INTO storage.buckets (id, name, public) 
VALUES ('identities', 'identities', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for Identities Bucket
DROP POLICY IF EXISTS "Public Identity Viewing" ON storage.objects;
CREATE POLICY "Public Identity Viewing" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'identities');

DROP POLICY IF EXISTS "Hosts can upload identities" ON storage.objects;
CREATE POLICY "Hosts can upload identities" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'identities' AND 
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'host'))
    );
