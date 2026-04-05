'use server';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Purges stale 'pending_checkouts' and 'resource_bookings' that were never completed.
 * Recommended to run every 6-12 hours via a cron job.
 */
export async function cleanupStaleSessions() {
    const adminSupabase = createAdminClient();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    console.log(`[CLEANUP] Initiating purge of sessions older than ${oneHourAgo}`);

    try {
        // 1. Delete expired pending_checkouts
        const { count: checkoutCount, error: checkoutError } = await adminSupabase
            .from('pending_checkouts')
            .delete({ count: 'exact' })
            .lt('created_at', oneHourAgo);

        if (checkoutError) throw checkoutError;
        console.log(`[CLEANUP] Purged ${checkoutCount} abandoned checkout sessions.`);

        // 2. Clear out 'pending_facility_review' resource_bookings that are also old and unpaid
        // (Adjust logic if facilities need more than 1 hour to review, 
        // but for short-lived 'guest' requests that aren't finalized, 24h is usually better)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { count: bookingCount, error: bookingError } = await adminSupabase
            .from('resource_bookings')
            .delete({ count: 'exact' })
            .eq('status', 'pending_facility_review')
            .eq('payment_status', null)
            .lt('created_at', oneDayAgo);

        if (bookingError) throw bookingError;
        console.log(`[CLEANUP] Purged ${bookingCount} stale booking requests.`);

        return { success: true, purgedCheckouts: checkoutCount, purgedBookings: bookingCount };
    } catch (err: any) {
        console.error('[CLEANUP_ERROR]', err.message);
        return { success: false, error: err.message };
    }
}
