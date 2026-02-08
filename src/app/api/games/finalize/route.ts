
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Auth Check (Admin Only ideally, but we'll check existance for now)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // In a real app, verify user.role === 'admin' here.

        const body = await request.json();
        const { gameId, homeScore, awayScore, status, mvpPlayerId, winner } = body;
        // winner: 'home' | 'away' | 'draw'

        if (!gameId) {
            return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
        }

        // 2. Fetch Game to get Team Names
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('teams_config')
            .eq('id', gameId)
            .single();

        if (gameError || !game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        const teams = game.teams_config || [
            { name: 'Team A' }, { name: 'Team B' }
        ];
        const homeTeamName = teams[0].name;
        const awayTeamName = teams[1].name;

        // 3. Update Game
        const { error: updateError } = await supabase
            .from('games')
            .update({
                home_score: homeScore,
                away_score: awayScore,
                status: status, // 'completed'
                mvp_player_id: mvpPlayerId || null
            })
            .eq('id', gameId);

        if (updateError) throw updateError;

        // 4. Update Winners (bookings.is_winner)
        // Reset all first (in case of re-finalization)
        await supabase
            .from('bookings')
            .update({ is_winner: false })
            .eq('game_id', gameId);

        if (winner === 'home') {
            await supabase
                .from('bookings')
                .update({ is_winner: true })
                .eq('game_id', gameId)
                .eq('team_assignment', homeTeamName);
        } else if (winner === 'away') {
            await supabase
                .from('bookings')
                .update({ is_winner: true })
                .eq('game_id', gameId)
                .eq('team_assignment', awayTeamName);
        }

        // 5. Update MVP (Increment mvp_awards)
        if (mvpPlayerId) {
            // We need to fetch current awards first or use an RPC increment.
            // Since we don't have a reliable RPC for this, we fetch & update.
            const { data: profile } = await supabase
                .from('profiles')
                .select('mvp_awards')
                .eq('id', mvpPlayerId)
                .single();

            if (profile) {
                await supabase
                    .from('profiles')
                    .update({ mvp_awards: (profile.mvp_awards || 0) + 1 })
                    .eq('id', mvpPlayerId);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Finalize Match Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
