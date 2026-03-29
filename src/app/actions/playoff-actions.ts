'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function seedPlayoffBracket(leagueId: string, topTeamsCount: number = 4) {
    const supabase = await createClient();

    // 1. Fetch League and matches
    const { data: league } = await supabase.from('games').select('playoff_start_date, facility_id, resource_id').eq('id', leagueId).single();
    if (!league?.playoff_start_date) throw new Error('Playoff start date not configured.');

    const { data: matches, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('game_id', leagueId);

    if (fetchError || !matches) throw new Error('Failed to fetch matches for seeding.');

    // 2. Calculate Standings with strict tie-breakers (Points > GD > GF)
    const stats: Record<string, { name: string, pts: number, gd: number, gf: number, ga: number, gp: number }> = {};

    matches.filter(m => m.status === 'completed').forEach(m => {
        [m.home_team, m.away_team].forEach(t => {
            if (!stats[t]) stats[t] = { name: t, pts: 0, gd: 0, gf: 0, ga: 0, gp: 0 };
        });

        const home = stats[m.home_team];
        const away = stats[m.away_team];

        home.gp++;
        away.gp++;
        home.gf += m.home_score;
        home.ga += m.away_score;
        away.gf += m.away_score;
        away.ga += m.home_score;

        if (m.home_score > m.away_score) {
            home.pts += 3;
        } else if (m.away_score > m.home_score) {
            away.pts += 3;
        } else {
            home.pts += 1;
            away.pts += 1;
        }
    });

    Object.values(stats).forEach(s => s.gd = s.gf - s.ga);

    const standings = Object.values(stats).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
    });

    if (standings.length < 2) throw new Error('Not enough teams to seed playoffs.');

    // 3. Generate Knockout Matches
    const knockoutMatches = [];
    const playoffStart = new Date(league.playoff_start_date);

    if (topTeamsCount === 4 && standings.length >= 4) {
        // Semi-Finals (1v4, 2v3)
        knockoutMatches.push({
            game_id: leagueId,
            home_team: standings[0].name,
            away_team: standings[3].name,
            start_time: playoffStart.toISOString(),
            round_number: 99,
            status: 'scheduled',
            tournament_stage: 'semi_final',
            is_playoff: true,
            field_name: 'Field 1'
        });
        
        const semi2Time = new Date(playoffStart.getTime() + 60 * 60000);
        knockoutMatches.push({
            game_id: leagueId,
            home_team: standings[1].name,
            away_team: standings[2].name,
            start_time: semi2Time.toISOString(),
            round_number: 99,
            status: 'scheduled',
            tournament_stage: 'semi_final',
            is_playoff: true,
            field_name: 'Field 1'
        });

        // Placeholder for Final
        const finalTime = new Date(semi2Time.getTime() + 60 * 60000);
        knockoutMatches.push({
            game_id: leagueId,
            home_team: 'Winner Semi 1',
            away_team: 'Winner Semi 2',
            start_time: finalTime.toISOString(),
            round_number: 100,
            status: 'scheduled',
            tournament_stage: 'final',
            is_playoff: true,
            field_name: 'Field 1'
        });
    } else {
        // Straight to Final (1v2)
        knockoutMatches.push({
            game_id: leagueId,
            home_team: standings[0].name,
            away_team: standings[1].name,
            start_time: playoffStart.toISOString(),
            round_number: 100,
            status: 'scheduled',
            tournament_stage: 'final',
            is_playoff: true,
            field_name: 'Field 1'
        });
    }

    const { error: insertError } = await supabase.from('matches').insert(knockoutMatches);
    if (insertError) throw new Error(insertError.message);

    revalidatePath(`/admin/games/${leagueId}`);
    return { success: true, count: knockoutMatches.length };
}
