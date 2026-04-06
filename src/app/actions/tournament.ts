'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function generateFinalRound(gameId: string) {
    const supabase = await createClient();

    // 1. Auth & Admin Check (Basic verification)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !['admin', 'master_admin', 'host'].includes(profile.role)) {
        throw new Error('Forbidden. Only admins/hosts can generate playoffs.');
    }

    // 2. Fetch game capabilities (mercy rule) and completed group stage matches
    const { data: gameData } = await supabase.from('games').select('mercy_rule_cap, is_league, amount_of_fields').eq('id', gameId).single();
    const mercyCap = gameData?.mercy_rule_cap;
    const isLeague = gameData?.is_league;
    const amountOfFields = gameData?.amount_of_fields || 1;

    let matchesQuery = supabase
        .from('matches')
        .select('*')
        .eq('game_id', gameId)
        .eq('status', 'completed');

    if (isLeague) {
        matchesQuery = matchesQuery.lt('round_number', 99); // Exclude knockout rounds if already produced
    } else {
        matchesQuery = matchesQuery.eq('tournament_stage', 'group');
    }

    const { data: matches, error: fetchError } = await matchesQuery;

    if (fetchError) {
        console.error('Error fetching regular season/group matches:', fetchError);
        throw new Error('Failed to fetch qualifying matches.');
    }

    if (!matches || matches.length === 0) {
        throw new Error('Not enough completed matches to generate playoffs.');
    }

    // 3. Calculate Standings
    interface TeamStats {
        name: string;
        points: number;
        gf: number;
        ga: number;
        gd: number;
    }

    const stats: Record<string, TeamStats> = {};

    const initTeam = (name: string) => {
        if (!stats[name]) stats[name] = { name, points: 0, gf: 0, ga: 0, gd: 0 };
    };

    matches.forEach(m => {
        const home = m.home_team;
        const away = m.away_team;
        initTeam(home);
        initTeam(away);

        let homeS = m.home_score || 0;
        let awayS = m.away_score || 0;

        if (mercyCap && mercyCap > 0) {
            const diff = Math.abs(homeS - awayS);
            if (diff > mercyCap) {
                if (homeS > awayS) {
                    homeS = awayS + mercyCap;
                } else {
                    awayS = homeS + mercyCap;
                }
            }
        }

        stats[home].gf += homeS;
        stats[home].ga += awayS;
        stats[away].gf += awayS;
        stats[away].ga += homeS;

        if (homeS > awayS) {
            stats[home].points += 3;
        } else if (awayS > homeS) {
            stats[away].points += 3;
        } else {
            stats[home].points += 1;
            stats[away].points += 1;
        }
    });

    Object.values(stats).forEach(t => t.gd = t.gf - t.ga);

    // 4. Sort to find rank order
    const standings = Object.values(stats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
    });

    if (standings.length < 2) {
        throw new Error('Not enough teams found to generate a final round. At least 2 required.');
    }

    // 5. Generate Matchups Based on Available Fields
    // E.g. Field 1 = Rank 1 vs 2, Field 2 = Rank 3 vs 4
    const knockoutMatches = [];
    const maxMatches = Math.min(amountOfFields, Math.floor(standings.length / 2));

    for (let i = 0; i < maxMatches; i++) {
        const homeTeam = standings[i * 2].name;
        const awayTeam = standings[(i * 2) + 1].name;

        knockoutMatches.push({
            game_id: gameId,
            home_team: homeTeam,
            away_team: awayTeam,
            home_score: 0,
            away_score: 0,
            round_number: 100, // Very high round number makes it the final stage natively
            status: 'scheduled',
            tournament_stage: 'final',
            field_name: `Field ${i + 1}`
        });
    }

    // 5. Cancel any remaining unplayed group stage matches so the UI advances
    const { error: cancelError } = await supabase
        .from('matches')
        .update({ status: 'cancelled' })
        .eq('game_id', gameId)
        .eq('status', 'scheduled')
        .lt('round_number', 99); // Don't cancel any previously generated finals, just group stages

    if (cancelError) {
        console.error('Error cancelling remaining group matches:', cancelError);
        // non-blocking fallback
    }

    // 6. Insert Matches
    const { error: insertError } = await supabase
        .from('matches')
        .insert(knockoutMatches);

    if (insertError) {
        console.error('Error inserting playoff matches:', insertError);
        throw new Error('Failed to generate playoff matches.');
    }

    // 6. Revalidate Caches
    revalidatePath(`/admin/games/${gameId}`);
    revalidatePath(`/games/${gameId}`);

    return { success: true, message: `Generated ${knockoutMatches.length} Final Round Matches on ${amountOfFields} fields.` };
}
