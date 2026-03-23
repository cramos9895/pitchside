import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, gameId, matchId, matchData } = body;

        const supabaseAdmin = createAdminClient();

        if (action === 'insert') {
            console.log('[MATCHES API] Inserting match:', { gameId, matchData });
            const { data, error } = await supabaseAdmin
                .from('matches')
                .insert({
                    game_id: gameId,
                    home_team: matchData.home_team,
                    away_team: matchData.away_team,
                    home_score: matchData.home_score || 0,
                    away_score: matchData.away_score || 0,
                    status: matchData.status || 'completed',
                    round_number: matchData.round_number || 0,
                    is_final: matchData.is_final || false
                })
                .select('id, game_id, home_team, away_team, home_score, away_score, is_final, created_at, round_number, status, start_time, field_name, is_playoff, match_style, timer_status, timer_started_at, paused_elapsed_seconds')
                .single();

            if (error) {
                console.error('[MATCHES API] Insert Error:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            console.log('[MATCHES API] Insert Success:', data.id);
            return NextResponse.json({ data });
        }

        if (action === 'update') {
            console.log('[MATCHES API] Updating match:', { matchId, matchData });
            const { data, error } = await supabaseAdmin
                .from('matches')
                .update(matchData)
                .eq('id', matchId)
            .select('id, game_id, home_team, away_team, home_score, away_score, is_final, created_at, round_number, status, start_time, field_name, is_playoff, match_style, timer_status, timer_started_at, paused_elapsed_seconds')
                .single();

            if (error) {
                console.error('[MATCHES API] Update Error:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            console.log('[MATCHES API] Update Success:', data.id);
            return NextResponse.json({ data });
        }

        if (action === 'delete') {
            console.log('[MATCHES API] Deleting match:', matchId);
            const { error } = await supabaseAdmin
                .from('matches')
                .delete()
                .eq('id', matchId);

            if (error) {
                console.error('[MATCHES API] Delete Error:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            console.log('[MATCHES API] Delete Success:', matchId);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('[MATCHES] Server Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const gameId = request.nextUrl.searchParams.get('gameId');
        if (!gameId) {
            return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();
        const { data, error } = await supabaseAdmin
            .from('matches')
            .select('id, game_id, home_team, away_team, home_score, away_score, is_final, created_at, round_number, status, start_time, field_name, is_playoff, match_style, timer_status, timer_started_at, paused_elapsed_seconds')
            .eq('game_id', gameId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[MATCHES] Fetch Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error('[MATCHES] Server Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
