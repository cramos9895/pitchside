import { createClient } from '@supabase/supabase-js';

// WARNING: This client bypasses RLS policies. Use only for restricted backend operations!
export const createAdminClient = () => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('[SUPABASE ADMIN STAGE]: Initializing with key prefix:', key ? key.substring(0, 15) + '...' : 'UNDEFINED');

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
            db: {
                schema: 'public'
            },
            global: {
                headers: {
                    'x-supabase-schema-cache': 'false'
                },
                fetch: (url, options) => {
                    return fetch(url, { ...options, cache: 'no-store' });
                }
            }
        }
    );
};
