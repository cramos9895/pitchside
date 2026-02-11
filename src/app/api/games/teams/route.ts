import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { gameId } = await request.json();

        // 1. Fetch Game Config (Teams) or default
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('teams_config')
            .eq('id', gameId)
            .single();

        if (gameError) throw gameError;

        const teams = (game.teams_config as any[]) || [
            { name: 'Team A', color: 'Neon Orange' },
            { name: 'Team B', color: 'White' }
        ];
        const teamNames = teams.map(t => t.name);

        // 2. Fetch all active/paid bookings
        const { data: bookings, error: fetchError } = await supabase
            .from('bookings')
            .select('id')
            .eq('game_id', gameId)
            .in('status', ['active', 'paid']);

        if (fetchError) throw fetchError;
        if (!bookings || bookings.length === 0) {
            // Return success even if empty so UI doesn't break, just nothing happens
            return NextResponse.json({ success: true, message: 'No players to randomize' });
        }

        // 3. Shuffle
        const shuffled = [...bookings].sort(() => Math.random() - 0.5);

        // 4. Distribute & Prepare Updates
        // Supabase bulk update workaround: We will loop for now as it is reliable.
        // For distinct values per row, standard SQL `UPDATE ... CASE ... END` is needed, or just multiple requests.
        // Given roster size ~20-30, parallel requests are fine.

        const updates = shuffled.map((booking, index) => {
            const teamIndex = index % teamNames.length;
            const assignedTeam = teamNames[teamIndex];

            return supabase
                .from('bookings')
                .update({ team_assignment: assignedTeam })
                .eq('id', booking.id);
        });

        await Promise.all(updates);

        return NextResponse.json({
            success: true,
            message: `Randomized ${bookings.length} players into ${teams.length} teams.`
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

        // Validate team? We trust the UI for now, or could fetch game config.
        // Allowing null (unassigned)

        const { error } = await supabase
            .from('bookings')
            .update({ team_assignment: team })
            .eq('id', bookingId);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
