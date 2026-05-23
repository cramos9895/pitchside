-- 🏗️ Architecture: [[Identity & Session Flow.md]]

-- Create security_logs table to track requests
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier TEXT NOT NULL, -- IP address or User ID
    path TEXT NOT NULL,       -- The specific API endpoint or Action name
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance during rate limit checks
CREATE INDEX IF NOT EXISTS idx_security_logs_identifier_path_created_at 
ON public.security_logs (identifier, path, created_at);

-- Set up RLS (Deny all by default, only accessible by Service Role/Admin)
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only access logs"
ON public.security_logs
FOR ALL
TO authenticated
USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'master_admin'));

-- Function to check rate limit
-- Returns TRUE if the limit is exceeded, FALSE otherwise
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_path TEXT,
    p_max_reqs INTEGER,
    p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with service role privileges
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Log the current attempt
    INSERT INTO public.security_logs (identifier, path)
    VALUES (p_identifier, p_path);

    -- Count requests in the window
    SELECT count(*)
    INTO v_count
    FROM public.security_logs
    WHERE identifier = p_identifier
      AND path = p_path
      AND created_at >= (now() - (p_window_seconds || ' seconds')::interval);

    -- Check if exceeded
    IF v_count > p_max_reqs THEN
        RETURN TRUE; -- Rate limited
    END IF;

    RETURN FALSE; -- Allowed
END;
$$;

-- Cleanup function to prevent table bloat (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_security_logs()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.security_logs
    WHERE created_at < (now() - INTERVAL '24 hours');
END;
$$;
