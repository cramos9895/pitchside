import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { gameId, note = '' } = await request.json();

        if (!gameId) {
            return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
        }

        // 1. Check if already joined/waitlisted (excluding cancelled)
        const { data: existing } = await supabase
            .from('bookings')
            .select('id, status')
            .eq('game_id', gameId)
            .eq('user_id', user.id)
            .neq('status', 'cancelled') // Ignore cancelled bookings
            .single();

        if (existing) {
            return NextResponse.json({
                success: false,
                message: existing.status === 'waitlist' ? 'You are already on the waitlist.' : 'You have already joined this game.'
            });
        }

        // 2. Insert Waitlist Booking
        const { error: insertError } = await supabase
            .from('bookings')
            .insert({
                user_id: user.id,
                game_id: gameId,
                status: 'waitlist',
                checked_in: false,
                team_assignment: null,
                note: note
            });

        if (insertError) throw insertError;

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('Waitlist Join Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
