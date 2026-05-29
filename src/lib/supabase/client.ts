import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

// 1. Store the instance internally
let supabaseInstance: SupabaseClient | null = null;

// 2. Export a Proxy that impersonates the client
export const supabase = new Proxy({} as SupabaseClient, {
    get(target, prop) {
        // Only initialize the very first time a property is accessed
        if (!supabaseInstance) {
            supabaseInstance = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
        }
        // Forward the access to the real instance
        const value = (supabaseInstance as any)[prop];
        return typeof value === 'function' ? value.bind(supabaseInstance) : value;
    }
});

// Legacy factory function (kept for backward compatibility during transition if needed, though we will refactor all)
// Or better, just export createClient that returns the singleton to not break files we haven't found.
export const createClient = () => supabase;
