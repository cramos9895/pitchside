'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function generatePlayoffs(gameId: string) {
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
    const { data: gameData } = await supabase.from('games').select('mercy_rule_cap, is_league').eq('id', gameId).single();
    const mercyCap = gameData?.mercy_rule_cap;
    const isLeague = gameData?.is_league;

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

    // 4. Sort to find Top 4
    const standings = Object.values(stats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
    });

    if (standings.length < 2) {
        throw new Error('Not enough teams found to generate playoffs. At least 2 required.');
    }

    // Identify participants
    const hasFourTeams = standings.length >= 4;

    // We can either do straight to Final (if < 4 teams) or Semi-Finals
    const knockoutMatches = [];

    if (hasFourTeams) {
        knockoutMatches.push({
            game_id: gameId,
            home_team: standings[0].name,
            away_team: standings[3].name,
            home_score: 0,
            away_score: 0,
            round_number: 99,
            status: 'scheduled',
            tournament_stage: 'semi_final'
        });
        knockoutMatches.push({
            game_id: gameId,
            home_team: standings[1].name,
            away_team: standings[2].name,
            home_score: 0,
            away_score: 0,
            round_number: 99,
            status: 'scheduled',
            tournament_stage: 'semi_final'
        });
        knockoutMatches.push({
            game_id: gameId,
            home_team: 'TBD Semi 1 Winner',
            away_team: 'TBD Semi 2 Winner',
            home_score: 0,
            away_score: 0,
            round_number: 100,
            status: 'scheduled',
            tournament_stage: 'final'
        });
    } else {
        // Less than 4 teams, go straight to Final
        knockoutMatches.push({
            game_id: gameId,
            home_team: standings[0].name,
            away_team: standings[1].name,
            home_score: 0,
            away_score: 0,
            round_number: 100,
            status: 'scheduled',
            tournament_stage: 'final'
        });
    }

    // 5. Insert Matches
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

    return { success: true, message: `Generated ${knockoutMatches.length} Playoff Matches.` };
}
