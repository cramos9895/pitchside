-- Fix RLS Policies for Check-in System

-- 1. Fix event_check_ins policies
DROP POLICY IF EXISTS "Hosts can view all check-ins" ON public.event_check_ins;
CREATE POLICY "Hosts can view all check-ins" ON public.event_check_ins
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('admin', 'host', 'master_admin') OR profiles.system_role = 'super_admin'))
        OR
        EXISTS (SELECT 1 FROM public.games WHERE games.id = event_check_ins.event_id AND auth.uid() = ANY(games.host_ids))
    );

DROP POLICY IF EXISTS "Hosts can manage check-ins" ON public.event_check_ins;
CREATE POLICY "Hosts can manage check-ins" ON public.event_check_ins
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('admin', 'host', 'master_admin') OR profiles.system_role = 'super_admin'))
        OR
        EXISTS (SELECT 1 FROM public.games WHERE games.id = event_check_ins.event_id AND auth.uid() = ANY(games.host_ids))
    );


-- 2. Fix event_identities policies
DROP POLICY IF EXISTS "Hosts can view event identities" ON public.event_identities;
CREATE POLICY "Hosts can view event identities" ON public.event_identities
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('admin', 'host', 'master_admin') OR profiles.system_role = 'super_admin'))
        OR
        EXISTS (SELECT 1 FROM public.games WHERE games.id = event_identities.event_id AND auth.uid() = ANY(games.host_ids))
    );

DROP POLICY IF EXISTS "Hosts can manage event identities" ON public.event_identities;
CREATE POLICY "Hosts can manage event identities" ON public.event_identities
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('admin', 'host', 'master_admin') OR profiles.system_role = 'super_admin'))
        OR
        EXISTS (SELECT 1 FROM public.games WHERE games.id = event_identities.event_id AND auth.uid() = ANY(games.host_ids))
    );

-- 3. Fix identities Storage Bucket Policy
DROP POLICY IF EXISTS "Hosts can upload identities" ON storage.objects;
CREATE POLICY "Hosts can upload identities" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'identities' AND 
        (
            EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('admin', 'host', 'master_admin') OR profiles.system_role = 'super_admin'))
            OR
            EXISTS (
                SELECT 1 FROM public.games 
                -- Assuming the file path is [event_id]/[user_id].ext, split_part(name, '/', 1) gives event_id
                WHERE games.id::text = split_part(name, '/', 1) 
                AND auth.uid() = ANY(games.host_ids)
            )
        )
    );

-- Also add an UPDATE policy just in case it attempts to upsert an existing photo
DROP POLICY IF EXISTS "Hosts can update identities" ON storage.objects;
CREATE POLICY "Hosts can update identities" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'identities' AND 
        (
            EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('admin', 'host', 'master_admin') OR profiles.system_role = 'super_admin'))
            OR
            EXISTS (
                SELECT 1 FROM public.games 
                WHERE games.id::text = split_part(name, '/', 1) 
                AND auth.uid() = ANY(games.host_ids)
            )
        )
    );
