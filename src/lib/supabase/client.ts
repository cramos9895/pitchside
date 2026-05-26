import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Legacy factory function (kept for backward compatibility during transition if needed, though we will refactor all)
// Or better, just export createClient that returns the singleton to not break files we haven't found.
export const createClient = () => supabase;
