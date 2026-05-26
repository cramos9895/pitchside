import { createClient } from '@supabase/supabase-js';

// This client is physically air-gapped from the Next.js SSR engine.
// It cannot touch cookies, locks, or broadcast channels.
export const projectorClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { 
        auth: { 
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storageKey: 'airgapped-projector-key',
            storage: {
                getItem: () => null,
                setItem: () => {},
                removeItem: () => {}
            },
            lock: async (name, acquireTimeout, fn) => {
                return await fn();
            }
        } 
    }
);
