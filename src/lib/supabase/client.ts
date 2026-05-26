
import { createBrowserClient } from '@supabase/ssr'
import { createClient as createVanillaClient, SupabaseClient } from '@supabase/supabase-js'

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

// For the Projector/Live view - Pure in-memory client, touches NO locks or cookies
export const rawSupabase = createVanillaClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { 
        auth: { 
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            // 1. Give it a fake name so it creates an isolated BroadcastChannel
            storageKey: 'isolated-projector-key',
            // 2. Provide a dummy memory storage so it physically cannot touch the browser's localStorage
            storage: {
                getItem: () => null,
                setItem: () => {},
                removeItem: () => {}
            },
            // 3. The VIP Bypass: Instantly execute auth callbacks without touching the browser's lock queue
            lock: async (name, acquireTimeout, fn) => {
                return await fn();
            }
        } 
    }
);

// Legacy factory function (kept for backward compatibility during transition if needed, though we will refactor all)
// Or better, just export createClient that returns the singleton to not break files we haven't found.
export function createClient() {
    return supabase;
}
