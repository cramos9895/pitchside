-- MIGRATION: Add Event Features
-- DESCRIPTION: Add is_active flags and event_templates table

BEGIN;

-- 1. Add is_active to games and leagues
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- 2. Create event_templates table
CREATE TABLE IF NOT EXISTS public.event_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    form_type text NOT NULL,
    template_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS and add policies
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates" 
ON public.event_templates FOR SELECT 
USING (auth.uid() = admin_id);

CREATE POLICY "Users can insert their own templates" 
ON public.event_templates FOR INSERT 
WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Users can update their own templates" 
ON public.event_templates FOR UPDATE 
USING (auth.uid() = admin_id);

CREATE POLICY "Users can delete their own templates" 
ON public.event_templates FOR DELETE 
USING (auth.uid() = admin_id);

COMMIT;