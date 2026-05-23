
import { createBrowserClient } from '@supabase/ssr'

// Cache the client instance to prevent infinite React render loops and lock deadlocks
let browserClient: any;

export function createClient() {
    if (browserClient) return browserClient;

    browserClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    return browserClient;
}
