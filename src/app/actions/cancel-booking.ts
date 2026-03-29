'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function cancelBooking(bookingId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Unauthorized.' };
    }

    const adminSupabase = createAdminClient();

    // 1. Fetch the booking to verify ownership and find the buyer_id and game_id
    const { data: booking, error: fetchError } = await adminSupabase
        .from('bookings')
        .select('id, user_id, buyer_id, game_id, payment_status, status')
        .eq('id', bookingId)
        .single();

    if (fetchError || !booking) {
        console.error("Fetch booking error:", fetchError);
        return { success: false, error: 'Booking not found.' };
    }

    // Only allow cancellation if user is the player OR the buyer OR a system admin
    const { data: profile } = await supabase.from('profiles').select('system_role').eq('id', user.id).single();
    const isOwner = booking.user_id === user.id || booking.buyer_id === user.id;
    const isAdmin = profile?.system_role === 'master_admin';

    if (!isOwner && !isAdmin) {
        return { success: false, error: 'Not authorized to cancel this booking.' };
    }

    // 2. Fetch the game to get the price and refund configuration
    const { data: game, error: gameError } = await adminSupabase
        .from('games')
        .select('price, start_time, is_refundable, refund_cutoff_date, refund_cutoff_hours')
        .eq('id', booking.game_id)
        .single();

    if (gameError || !game) {
        return { success: false, error: 'Failed to retrieve game pricing.' };
    }

    // 3. Cutoff Engine Hierarchy Check (same logic as /api/leave)
    const startTime = new Date(game.start_time).getTime();
    const now = new Date().getTime();
    const hoursRemaining = (startTime - now) / (1000 * 60 * 60);

    let isRefundEligible = false;
    if (game.is_refundable) {
        if (game.refund_cutoff_date) {
            // Priority 1: Explicit Date
            const cutoffTime = new Date(game.refund_cutoff_date).getTime();
            if (now < cutoffTime) isRefundEligible = true;
        } else if (game.refund_cutoff_hours !== null && game.refund_cutoff_hours !== undefined) {
            // Priority 2: Rolling Hours Cutoff
            if (hoursRemaining > game.refund_cutoff_hours) isRefundEligible = true;
        } else {
            isRefundEligible = true; // Refundable but no limits set
        }
    }

    // 4. Determine the wallet that receives the refund
    // If buyer_id exists, the buyer gets the refund (even if a guest cancels).
    const refundTargetId = booking.buyer_id || booking.user_id;
    const refundAmountCents = Math.round((game.price || 0) * 100);

    let refunded = false;

    // 5. Execute refund if eligible
    if (refundAmountCents > 0 && ['paid', 'active'].includes(booking.status) && isRefundEligible) {
        // Fetch current balance
        const { data: targetProfile, error: profileErr } = await adminSupabase
            .from('profiles')
            .select('credit_balance')
            .eq('id', refundTargetId)
            .single();

        if (!profileErr && targetProfile) {
            const currentBalance = targetProfile.credit_balance || 0;
            // Add refund
            await adminSupabase
                .from('profiles')
                .update({ credit_balance: currentBalance + refundAmountCents })
                .eq('id', refundTargetId);
            refunded = true;
        }
    }

    // 6. Update the booking status to cancelled + dropped (soft delete to preserve history)
    const { error: updateError } = await adminSupabase
        .from('bookings')
        .update({ status: 'cancelled', roster_status: 'dropped' })
        .eq('id', bookingId);

    if (updateError) {
        console.error("Cancel booking error:", updateError);
        return { success: false, error: 'Failed to cancel the booking.' };
    }

    return { success: true, refunded };
}
