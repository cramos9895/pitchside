// 🏗️ Architecture: [[Identity & Session Flow.md]]

import { createAdminClient } from '@/lib/supabase/admin';
import { type NextRequest } from 'next/server';

/**
 * Checks if a request should be rate-limited.
 * 
 * @param identifier - The IP Address or User ID to track
 * @param path - The name of the endpoint or action (e.g., 'auth:login')
 * @param maxRequests - Max requests allowed in the window
 * @param windowSeconds - Size of the fixed window in seconds
 * @returns boolean - True if limited, False if allowed
 */
export async function isRateLimited(
    identifier: string,
    path: string,
    maxRequests: number,
    windowSeconds: number
): Promise<boolean> {
    const supabase = createAdminClient();

    try {
        const { data, error } = await supabase.rpc('check_rate_limit', {
            p_identifier: identifier,
            p_path: path,
            p_max_reqs: maxRequests,
            p_window_seconds: windowSeconds
        });

        if (error) {
            console.error('[SECURITY_SYSTEM] Rate limit RPC error:', error);
            // Fail-safe: Allow the request if the security check fails for technical reasons
            return false;
        }

        return data as boolean;
    } catch (err) {
        console.error('[SECURITY_SYSTEM] Rate limit check exception:', err);
        return false;
    }
}

/**
 * Helper to get the client IP from a NextRequest.
 */
export function getClientIp(req: Request | NextRequest): string {
    const forwarded = (req as any).headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return '127.0.0.1'; // Fallback for local dev
}
