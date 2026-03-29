import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { sendNotification } from '@/lib/email';



export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { gameId } = await request.json();

        if (!gameId) {
            return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        // 1. Fetch Game Details for Time Check and Cutoff Engine
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('start_time, price, title, location, is_refundable, refund_cutoff_date, refund_cutoff_hours')
            .eq('id', gameId)
            .single();

        if (gameError || !game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        // 2. Get current booking status (Handle multiple bookings if user left and rejoined)
        const { data: bookings, error: fetchError } = await supabaseAdmin
            .from('bookings')
            .select('id, status, roster_status, payment_status, buyer_id')
            .eq('game_id', gameId)
            .eq('user_id', user.id)
            .neq('status', 'cancelled')
            .order('created_at', { ascending: false })
            .limit(1);

        const booking = bookings?.[0];

        if (fetchError) {
            console.error('[LEAVE] Fetch Booking Error:', fetchError);
            return NextResponse.json({ error: fetchError.message || 'Database fetch error', details: fetchError }, { status: 500 });
        }

        if (!booking) {
            console.warn(`[LEAVE] No active booking found for user ${user.id} in game ${gameId}`);
            return NextResponse.json({ error: 'No active booking found. You may have already left this game or your booking was not confirmed.' }, { status: 404 });
        }

        if (booking.status === 'cancelled') {
            return NextResponse.json({ message: 'Already cancelled', success: true });
        }

        // 3. Cutoff Engine Hierarchy Check
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
                 isRefundEligible = true; // Refundable but no limits set natively
            }
        }

        let refunded = false;
        let message = 'You have left the game.';

        // 4. Refund Logic (Monetary Credit Injection)
        // Only refund if they were 'paid' or active. Waitlist users leaving don't need refund logic usually but safe to check.
        if (booking.status === 'paid' || booking.status === 'active') {
            if (isRefundEligible) {
                // Squad Refund Routing: Map injection back to the buyer
                const targetUserId = booking.buyer_id ? booking.buyer_id : user.id;
                const refundAmountCents = Math.round((game.price || 0) * 100);

                if (refundAmountCents > 0) {
                    const { data: targetProfile, error: profileError } = await supabaseAdmin
                        .from('profiles')
                        .select('credit_balance')
                        .eq('id', targetUserId)
                        .single();

                    if (targetProfile && !profileError) {
                        const newBalance = (targetProfile.credit_balance || 0) + refundAmountCents;
                        await supabaseAdmin
                            .from('profiles')
                            .update({ credit_balance: newBalance })
                            .eq('id', targetUserId);
                        
                        refunded = true;
                        if (booking.buyer_id) {
                            message = 'Booking cancelled. The purchase price has been refunded back to the buyer\'s Pitchside Wallet.';
                        } else {
                            message = 'Booking cancelled. The purchase price has been refunded to your Pitchside Wallet.';
                        }
                    } else if (profileError) {
                        console.error("Failed to refund credit balance:", profileError);
                    }
                } else {
                    refunded = true;
                    message = 'Booking cancelled. (Game was free, no funds exchanged).';
                }
            } else {
                message = 'Booking cancelled. No refund issued (Past cutoff window).';
            }
        } else if (booking.status === 'waitlist') {
            message = 'You have left the waitlist.';
        }

        // Fetch profile for display name in email
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        // 5. Update booking status to 'cancelled' and 'dropped'
        const { error: updateError } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'cancelled', roster_status: 'dropped' })
            .eq('id', booking.id);

        if (updateError) throw updateError;

        // 5b. Send Cancellation Receipt (if applicable)
        if (booking.status === 'paid' || booking.status === 'active') {
            if (user?.email) {
                try {
                    await sendNotification({
                        to: user.email,
                        subject: `Cancellation Confirmed: ${game.title}`,
                        type: 'cancellation',
                        data: {
                            userName: profile?.full_name || 'Player',
                            gameTitle: game.title,
                            gameDate: new Date(game.start_time).toLocaleDateString(),
                            refundMethod: refunded ? 'Credits' : 'None (Late Cancellation)'
                        }
                    });
                } catch (emailErr) {
                    console.error('Cancellation Email Error:', emailErr);
                }
            }
        }

        // 6. Check for Waitlist and Auto-Promote
        try {
            if (booking.status === 'paid' || booking.status === 'active') {
                const { data: waitlistBookings } = await supabaseAdmin
                    .from('bookings')
                    .select('id, user_id')
                    .eq('game_id', gameId)
                    .or('roster_status.eq.waitlisted,status.eq.waitlist')
                    .order('created_at', { ascending: true })
                    .limit(1);

                const nextWaitlist = waitlistBookings?.[0];

                if (nextWaitlist) {
                    // Auto-Promote the player
                    await supabaseAdmin
                        .from('bookings')
                        .update({
                            roster_status: 'confirmed',
                            status: 'paid', // keep legacy sync
                            payment_status: 'pending' // need to verify payment still
                        })
                        .eq('id', nextWaitlist.id);

                    const { data: waitlistProfile } = await supabaseAdmin
                        .from('profiles')
                        .select('email, full_name')
                        .eq('id', nextWaitlist.user_id)
                        .single();

                    if (waitlistProfile && waitlistProfile.email) {
                        try {
                            await sendNotification({
                                to: waitlistProfile.email,
                                subject: `Spot Open: You have been promoted for ${game.title}!`,
                                type: 'waitlist_promotion',
                                data: {
                                    userName: waitlistProfile.full_name || 'Player',
                                    gameTitle: game.title,
                                    gameDate: new Date(game.start_time).toLocaleDateString(),
                                    gameTime: new Date(game.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    location: game.location || 'TBD',
                                    claimUrl: `https://www.pitchsidecf.com/games/${gameId}`
                                }
                            });
                        } catch (emailErr) {
                            console.error('Waitlist Notification Error:', emailErr);
                        }
                    }
                }
            }
        } catch (emailErr) {
            console.error('Waitlist Notification Error:', emailErr);
            // Don't fail the cancellation if email fails
        }

        return NextResponse.json({ success: true, refunded, message });

    } catch (err: any) {
        console.error('[LEAVE ERROR]:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error', details: err }, { status: 500 });
    }
}
