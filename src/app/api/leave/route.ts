
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendPitchSideEmail } from '@/lib/emails/sendEmail';
import { WaitlistAlertEmail } from '@/emails/WaitlistAlertEmail';
import { CancellationEmail } from '@/emails/CancellationEmail';


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

        // 1. Fetch Game Details for Time Check
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('start_time, price, title, location')
            .eq('id', gameId)
            .single();

        if (gameError || !game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        // 2. Get current booking status
        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select('id, status')
            .eq('game_id', gameId)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        if (booking.status === 'cancelled') {
            return NextResponse.json({ message: 'Already cancelled', success: true });
        }

        // 3. Check Time Window (6 Hours)
        const startTime = new Date(game.start_time).getTime();
        const now = new Date().getTime();
        const hoursRemaining = (startTime - now) / (1000 * 60 * 60);

        let refunded = false;
        let message = 'You have left the game.';

        // 4. Refund Logic (Credit Only) based on 6 Hour Window AND Paid Status
        // Only refund if they were 'paid' or active. Waitlist users leaving don't need refund logic usually but safe to check.
        // Assuming 'paid' means they used a credit or paid cash.
        if (booking.status === 'paid' || booking.status === 'active') {
            if (hoursRemaining > 6) {
                // Fetch current credits to increment
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('free_game_credits')
                    .eq('id', user.id)
                    .single();

                if (profile && !profileError) {
                    const newCredits = (profile.free_game_credits || 0) + 1;
                    await supabase
                        .from('profiles')
                        .update({ free_game_credits: newCredits })
                        .eq('id', user.id);
                    refunded = true;
                    message = 'Booking cancelled. A game credit has been refunded to your account.';
                }
            } else {
                message = 'Booking cancelled. No refund issued (less than 6 hours to start).';
            }
        } else if (booking.status === 'waitlist') {
            message = 'You have left the waitlist.';
        }

        // 5. Update booking status to 'cancelled' and 'dropped'
        const { error: updateError } = await supabase
            .from('bookings')
            .update({ status: 'cancelled', roster_status: 'dropped' })
            .eq('id', booking.id);

        if (updateError) throw updateError;

        // 5b. Send Cancellation Receipt (if applicable)
        if (booking.status === 'paid' || booking.status === 'active') {
            try {
                await sendPitchSideEmail({
                    to: user.email!,
                    subject: `Cancellation Confirmed: ${game.title}`,
                    react: CancellationEmail({
                        playerName: user.user_metadata?.full_name || 'Player',
                        gameDate: new Date(game.start_time).toLocaleDateString(),
                        refundMethod: refunded ? 'Credits' : 'None (Late Cancellation)'
                    })
                });
            } catch (emailErr) {
                console.error('Cancellation Email Error:', emailErr);
            }
        }

        // 6. Check for Waitlist and Auto-Promote
        try {
            // Only promote if the person leaving was actually holding a spot, not if they were waitlisted
            if (booking.status === 'paid' || booking.status === 'active') {
                const { data: nextWaitlist } = await supabase
                    .from('bookings')
                    .select('id, user_id')
                    .eq('game_id', gameId)
                    .in('roster_status', ['waitlisted'])
                    .order('created_at', { ascending: true })
                    .limit(1)
                    .single();

                if (nextWaitlist) {
                    // Auto-Promote the player
                    await supabase
                        .from('bookings')
                        .update({
                            roster_status: 'confirmed',
                            status: 'paid', // keep legacy sync
                            payment_status: 'pending' // need to verify payment still
                        })
                        .eq('id', nextWaitlist.id);

                    const { data: waitlistProfile } = await supabase
                        .from('profiles')
                        .select('email, full_name')
                        .eq('id', nextWaitlist.user_id)
                        .single();

                    if (waitlistProfile && waitlistProfile.email) {
                        try {
                            await sendPitchSideEmail({
                                to: waitlistProfile.email,
                                subject: `Spot Open: You have been promoted for ${game.title}!`,
                                react: WaitlistAlertEmail({
                                    gameDate: new Date(game.start_time).toLocaleDateString(),
                                    time: new Date(game.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    location: game.location || 'TBD',
                                    claimUrl: `https://www.pitchsidecf.com/games/${gameId}`
                                })
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
        console.error('Leave Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
