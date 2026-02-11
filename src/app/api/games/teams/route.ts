import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { gameId } = await request.json();

        // 1. Fetch all active/paid bookings
        const { data: bookings, error: fetchError } = await supabase
            .from('bookings')
            .select('id')
            .eq('game_id', gameId)
            .in('status', ['active', 'paid']);

        if (fetchError) throw fetchError;
        if (!bookings || bookings.length === 0) {
            return NextResponse.json({ message: 'No players to randomize' });
        }

        // 2. Shuffle
        const shuffled = [...bookings].sort(() => Math.random() - 0.5);

        // 3. Split
        const mid = Math.ceil(shuffled.length / 2);
        const teamA = shuffled.slice(0, mid);
        const teamB = shuffled.slice(mid);

        // 4. Update DB
        // We can do this with Promise.all for now as it's likely < 30 items
        const updates = [
            ...teamA.map(b => supabase.from('bookings').update({ team: 'A' }).eq('id', b.id)),
            ...teamB.map(b => supabase.from('bookings').update({ team: 'B' }).eq('id', b.id))
        ];

        await Promise.all(updates);

        return NextResponse.json({
            success: true,
            teamA: teamA.length,
            teamB: teamB.length
        });

    } catch (error: any) {
        console.error('Randomization Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const supabase = await createClient();
        const { bookingId, team } = await request.json();

        // Validate team
        if (team !== 'A' && team !== 'B' && team !== null) {
            return NextResponse.json({ error: 'Invalid team' }, { status: 400 });
        }

        const { error } = await supabase
            .from('bookings')
            .update({ team })
            .eq('id', bookingId);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
