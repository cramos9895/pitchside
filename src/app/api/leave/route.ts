
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';


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
            .select('start_time, price')
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

        // 5. Update booking status to 'cancelled'
        const { error: updateError } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', booking.id);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, refunded, message });

    } catch (err: any) {
        console.error('Leave Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
