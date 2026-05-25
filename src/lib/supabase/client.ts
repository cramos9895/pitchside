
import { createBrowserClient } from '@supabase/ssr'
import { createClient as createVanillaClient } from '@supabase/supabase-js'

// The singular, guaranteed instance for the entire React application
export const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// For the Projector/Live view - Pure in-memory client, touches NO locks or cookies
export const rawSupabase = createVanillaClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { 
        auth: { 
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        } 
    }
);

// Legacy factory function (kept for backward compatibility during transition if needed, though we will refactor all)
// Or better, just export createClient that returns the singleton to not break files we haven't found.
export function createClient() {
    return supabase;
}
