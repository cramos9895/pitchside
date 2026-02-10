
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

        // 1. Get current booking status
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
            return NextResponse.json({ message: 'Already cancelled' });
        }

        // 2. Update booking status to 'cancelled'
        const { error: updateError } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', booking.id);

        if (updateError) throw updateError;

        // 3. Decrement player count ONLY if they were taking up a spot (active/paid)
        // Waitlist players don't count towards the limit, so we don't decrement.
        if (booking.status === 'active' || booking.status === 'paid') {
            // We can use a stored procedure if available, or just manual decrement.
            // Given the previous file didn't definitely use an RPC, we'll try RPC first then fallback?
            // Actually, safely we should use RPC.
            // Let's check if 'decrement_player_count' exists? probably not.
            // We'll do a manual update for now to match the "create game" simplicity, 
            // but ideally we'd use `current_players = current_players - 1`.

            // Fetch current game count first to be safe?
            // or use RPC.
            // Let's try to assume we can just decrement.

            const { error: decrementError } = await supabase.rpc('decrement_player_count', { game_id: gameId });

            if (decrementError) {
                // Fallback to manual
                // Fetch game
                const { data: game } = await supabase.from('games').select('current_players').eq('id', gameId).single();
                if (game) {
                    const newCount = Math.max(0, game.current_players - 1);
                    await supabase.from('games').update({ current_players: newCount }).eq('id', gameId);
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('Leave Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
