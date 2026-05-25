
import { createBrowserClient } from '@supabase/ssr'

// The singular, guaranteed instance for the entire React application
export const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// For the Projector/Live view that needs to bypass Auth
export const rawSupabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { 
        auth: { 
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            multiTab: false,
            storageKey: 'isolated-projector-key'
        } 
    }
);

// Legacy factory function (kept for backward compatibility during transition if needed, though we will refactor all)
// Or better, just export createClient that returns the singleton to not break files we haven't found.
export function createClient() {
    return supabase;
}
