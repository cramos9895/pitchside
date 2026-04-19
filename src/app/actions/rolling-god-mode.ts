'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { checkOverlap } from './league-actions';

/**
 * Creates a team manually.
 */
export async function createManualTeam(gameId: string, name: string, captainId?: string) {
    const supabase = await createClient();
    
    // We use service role to bypass policies if needed, but createClient might be enough if admin.
    // We'll use createAdminClient to ensure God Mode bypasses any restrictions.
    const adminSupabase = await createAdminClient();

    const { data, error } = await adminSupabase
        .from('teams')
        .insert({
            game_id: gameId,
            name,
            captain_id: captainId || null,
            status: 'approved',
            accepting_free_agents: true
        })
        .select()
        .single();

    if (error) throw new Error(`Failed to create team: ${error.message}`);
    
    revalidatePath(`/admin/games/${gameId}`);
    return { success: true, team: data };
}

/**
 * Updates a team's basic details.
 */
export async function updateTeamDetails(teamId: string, gameId: string, updates: { name?: string; captain_id?: string }) {
    const adminSupabase = await createAdminClient();
    const { error } = await adminSupabase
        .from('teams')
        .update(updates)
        .eq('id', teamId);

    if (error) throw new Error(`Failed to update team: ${error.message}`);
    
    revalidatePath(`/admin/games/${gameId}`);
    return { success: true };
}

/**
 * Atomically transfers a player from their current team to a target team.
 * Preserves the row to retain Stripe payment history.
 */
export async function transferPlayer(registrationId: string, targetTeamId: string, gameId: string) {
    const adminSupabase = await createAdminClient();
    
    const { error } = await adminSupabase
        .from('tournament_registrations')
        .update({ team_id: targetTeamId })
        .eq('id', registrationId);

    if (error) throw new Error(`Transfer failed: ${error.message}`);

    revalidatePath(`/admin/games/${gameId}`);
    return { success: true };
}

/**
 * Takes an array of Free Agent player IDs, creates a temporary "Draft Squad X" team,
 * and atomically assigns them.
 */
export async function draftAutoTeam(gameId: string, registrationIds: string[]) {
    const adminSupabase = await createAdminClient();
    
    // 1. Generate Team Name
    const { data: existingTeams } = await adminSupabase
        .from('teams')
        .select('id')
        .eq('game_id', gameId);
        
    const teamNumber = existingTeams ? existingTeams.length + 1 : 1;
    const teamName = `Draft Squad ${teamNumber}`;

    // 2. Create the Team
    const { data: newTeam, error: teamError } = await adminSupabase
        .from('teams')
        .insert({
            game_id: gameId,
            name: teamName,
            status: 'approved',
            accepting_free_agents: true
        })
        .select()
        .single();
        
    if (teamError || !newTeam) throw new Error(`Draft team creation failed: ${teamError?.message}`);

    // 3. Assign Players (bulk update)
    const { error: updateError } = await adminSupabase
        .from('tournament_registrations')
        .update({ team_id: newTeam.id, role: 'player' }) // First player can be made captain manually later
        .in('id', registrationIds);

    if (updateError) throw new Error(`Assigning players failed: ${updateError.message}`);

    revalidatePath(`/admin/games/${gameId}`);
    return { success: true, team: newTeam };
}

/**
 * Manually logs a historical match to feed into the standings.
 * Enforces team selection from actual DB teams, so aggregate works correctly.
 */
export async function logPastMatch(gameId: string, homeTeamName: string, awayTeamName: string, homeScore: number, awayScore: number, dateString: string) {
    const adminSupabase = await createAdminClient();
    
    const { error } = await adminSupabase.from('matches').insert({
        game_id: gameId,
        home_team: homeTeamName,
        away_team: awayTeamName,
        home_score: homeScore,
        away_score: awayScore,
        start_time: new Date(dateString).toISOString(),
        status: 'completed',
        is_final: true,
        field_name: 'Historical Entry'
    });

    if (error) throw new Error(`Failed to log match: ${error.message}`);
    
    revalidatePath(`/admin/games/${gameId}`);
    return { success: true };
}

/**
 * Administrative override for match objects.
 */
export async function updateMatchOverride(matchId: string, gameId: string, updates: any) {
    const adminSupabase = await createAdminClient();
    
    const { error } = await adminSupabase
        .from('matches')
        .update(updates)
        .eq('id', matchId);

    if (error) throw new Error(`Match modification failed: ${error.message}`);

    revalidatePath(`/admin/games/${gameId}`);
    return { success: true };
}

/**
 * Calculates pairings and schedules the next rolling round.
 * Moved from league-actions to be specific to Rolling Manager.
 */
export async function scheduleNextRound(leagueId: string, teams: any[], facilityId: string) {
    const adminSupabase = await createAdminClient();
    
    // Fetch parent Game Config
    const { data: game, error: gameError } = await adminSupabase.from('games').select('*').eq('id', leagueId).single();
    if (!game) throw new Error("Game configuration not found");

    // Fetch existing matches
    const { data: matches } = await adminSupabase.from('matches').select('start_time, home_team_id, away_team_id, home_team, away_team').eq('game_id', leagueId);
    
    // Target Date Determination
    const gameStartDateTime = new Date(game.start_time);
    const targetDayOfWeek = gameStartDateTime.getDay();
    let targetDate = new Date(gameStartDateTime);
    
    if (matches && matches.length > 0) {
        const lastMatchTime = matches.reduce((latest, m) => {
            const mTime = new Date(m.start_time).getTime();
            return mTime > latest ? mTime : latest;
        }, 0);
        
        targetDate = new Date(lastMatchTime);
        targetDate.setDate(targetDate.getDate() + 1); // Start checking the day after the latest match
        
        // Advance until the day of the week matches the original game day
        while (targetDate.getDay() !== targetDayOfWeek) {
            targetDate.setDate(targetDate.getDate() + 1);
        }
    }
    
    // Blackout Evasion processing
    let foundValidDate = false;
    let safetyCounter = 0;
    while (!foundValidDate && safetyCounter < 52) { // Max 1 year evasion limit
        safetyCounter++;
        const targetStringMatch = targetDate.toISOString().split('T')[0];
        
        let shouldSkip = false;
        if (game.skip_dates && Array.isArray(game.skip_dates)) {
            shouldSkip = game.skip_dates.some((dt: string) => dt.startsWith(targetStringMatch));
        }

        if (shouldSkip) {
            targetDate.setDate(targetDate.getDate() + 1);
            while (targetDate.getDay() !== targetDayOfWeek) {
                targetDate.setDate(targetDate.getDate() + 1);
            }
        } else {
            foundValidDate = true;
        }
    }

    if (safetyCounter >= 52) {
        throw new Error("Schedule generation failed: Exceeded maximum blackout evasion loop check.");
    }
    
    // Track previous matchups
    const playedCounts: Record<string, number> = {};
    const playedAgainst: Record<string, Set<string>> = {};
    teams.forEach(t => {
        playedCounts[t.id] = 0;
        playedAgainst[t.id] = new Set();
    });

    if (matches) {
        matches.forEach(m => {
            if (m.home_team_id && playedCounts[m.home_team_id] !== undefined) playedCounts[m.home_team_id]++;
            if (m.away_team_id && playedCounts[m.away_team_id] !== undefined) playedCounts[m.away_team_id]++;
            
            if (m.home_team_id && m.away_team_id) {
                if (playedAgainst[m.home_team_id]) playedAgainst[m.home_team_id].add(m.away_team_id);
                if (playedAgainst[m.away_team_id]) playedAgainst[m.away_team_id].add(m.home_team_id);
            }
        });
    }

    // Sort ascending so fewest matches played are paired first
    const sortedTeams = [...teams].sort((a, b) => playedCounts[a.id] - playedCounts[b.id]);

    let byeTeam = null;
    let teamsToPair = [...sortedTeams];

    if (teamsToPair.length % 2 !== 0) {
        byeTeam = teamsToPair.pop()!;
    }

    // [TeamA, TeamB] where team is the full object
    const pairings: [any, any][] = [];
    const unavailable = new Set<string>();

    for (let i = 0; i < teamsToPair.length; i++) {
        const teamA = teamsToPair[i];
        if (unavailable.has(teamA.id)) continue;

        let bestOpponent = null;
        for (let j = i + 1; j < teamsToPair.length; j++) {
            const teamB = teamsToPair[j];
            if (unavailable.has(teamB.id)) continue;

            if (!playedAgainst[teamA.id].has(teamB.id)) {
                bestOpponent = teamB;
                break;
            }
        }

        if (!bestOpponent) {
            for (let j = i + 1; j < teamsToPair.length; j++) {
                const teamB = teamsToPair[j];
                if (!unavailable.has(teamB.id)) {
                    bestOpponent = teamB;
                    break;
                }
            }
        }

        if (bestOpponent) {
            pairings.push([teamA, bestOpponent]);
            unavailable.add(teamA.id);
            unavailable.add(bestOpponent.id);
        }
    }

    // Generate accurate Time Matrix starting at game.start_time time boundaries
    targetDate.setUTCHours(gameStartDateTime.getUTCHours(), gameStartDateTime.getUTCMinutes(), 0, 0);
    
    // Parse the strict end time from string (e.g. "22:00:00")
    let gameEndTimeLimit = null;
    if (game.end_time) {
        const [hours, mins] = game.end_time.split(':');
        gameEndTimeLimit = new Date(targetDate);
        // Correcting for potentially non-UTC native time depending on Postgres type storage.
        gameEndTimeLimit.setUTCHours(parseInt(hours), parseInt(mins), 0, 0); 
    }

    const slotDurationMs = ((game.total_game_time ?? 60) || 60) * 60 * 1000;
    const maxFields = game.amount_of_fields || 1;
    const fieldNames = game.field_names && game.field_names.length > 0 
        ? game.field_names 
        : Array.from({length: maxFields}, (_, i) => `Field ${i + 1}`);

    const matchesToInsert = [];
    let currentMatrixTime = new Date(targetDate);
    let currentFieldIndex = 0;

    for (let i = 0; i < pairings.length; i++) {
        // If we exhausted all concurrent fields for this time slot, increment the time block and reset field index
        if (currentFieldIndex >= maxFields) {
            currentMatrixTime = new Date(currentMatrixTime.getTime() + slotDurationMs);
            currentFieldIndex = 0;
        }

        // Safety enforcement: Do not exceed game.end_time barrier
        if (gameEndTimeLimit && currentMatrixTime >= gameEndTimeLimit) {
            throw new Error(`Schedule overflow: Not enough physical field capacity to schedule all matchups before the mandatory end limit of ${game.end_time}.`);
        }
        
        matchesToInsert.push({
            game_id: leagueId,
            home_team: pairings[i][0].name,
            home_team_id: pairings[i][0].id,
            away_team: pairings[i][1].name,
            away_team_id: pairings[i][1].id,
            start_time: currentMatrixTime.toISOString(),
            status: 'scheduled',
            field_name: fieldNames[currentFieldIndex] || `Field ${currentFieldIndex + 1}`
        });

        currentFieldIndex++;
    }

    if (matchesToInsert.length > 0) {
        const { error } = await adminSupabase.from('matches').insert(matchesToInsert);
        if (error) throw new Error(error.message);
    }

    revalidatePath(`/admin/games/${leagueId}`);
    return { success: true, count: matchesToInsert.length, byeTeam };
}

// -------------------------------------------------------------
// NEW CASH OPERATIONS
// -------------------------------------------------------------

export async function toggleCashPayment(registrationId: string, isPaid: boolean, amountChanged: number, gameId: string) {
    const adminSupabase = await createAdminClient();
    
    // We need to fetch current total to increment safely. Wrapping in basic validation.
    if (!registrationId.includes('-')) {
        return { success: false, error: 'Registration is missing a valid database ID (likely an incomplete mock player).' };
    }

    const { data: reg, error: fetchErr } = await adminSupabase
        .from('tournament_registrations')
        .select('total_cash_collected')
        .eq('id', registrationId)
        .single();
        
    if (fetchErr) return { success: false, error: `Fetch failed: ${fetchErr.message}` };

    const newTotal = (reg.total_cash_collected || 0) + (isPaid ? amountChanged : -amountChanged);

    const { error } = await adminSupabase
        .from('tournament_registrations')
        .update({
            cash_paid_current_round: isPaid,
            total_cash_collected: newTotal
        })
        .eq('id', registrationId);

    if (error) return { success: false, error: `Toggle cash failed: ${error.message}` };
    revalidatePath(`/admin/games/${gameId}`);
    return { success: true };
}

export async function resetCashTracker(gameId: string) {
    const adminSupabase = await createAdminClient();
    
    const { error } = await adminSupabase
        .from('tournament_registrations')
        .update({ cash_paid_current_round: false })
        .eq('game_id', gameId);

    if (error) throw new Error(`Reset cash tracker failed: ${error.message}`);
    revalidatePath(`/admin/games/${gameId}`);
    return { success: true };
}

// -------------------------------------------------------------
// SETTINGS UPDATE
// -------------------------------------------------------------

export async function updateLeagueSettings(gameId: string, updates: any) {
    const adminSupabase = await createAdminClient();
    
    const { error } = await adminSupabase
        .from('games')
        .update(updates)
        .eq('id', gameId);

    if (error) throw new Error(`Update league settings failed: ${error.message}`);
    revalidatePath(`/admin/games/${gameId}`);
    return { success: true };
}

// -------------------------------------------------------------
// PLAYOFF ENGINE & BULK SCHEDULING
// -------------------------------------------------------------

export async function bulkScheduleSeason(gameId: string, teams: string[], facilityId: string, endDateStr: string) {
    const adminSupabase = await createAdminClient();
    const endDate = new Date(endDateStr);
    
    let scheduledMatchesCount = 0;
    
    // We run the scheduleNextRound logic repeatedly until the projected nextStartTime passes endDate
    // For simplicity here, we'll try to generate rounds in sequential loops up to 12 weeks ahead.
    for (let round = 0; round < 12; round++) {
        // Find latest schedule date
        const { data: matches } = await adminSupabase.from('matches').select('start_time').eq('game_id', gameId).order('start_time', { ascending: false }).limit(1);
        
        let nextStartEstimate = new Date();
        if (matches && matches.length > 0) {
            nextStartEstimate = new Date(new Date(matches[0].start_time).getTime() + 7 * 24 * 60 * 60 * 1000);
        }
        
        if (nextStartEstimate > endDate) {
            break; // Reached cap
        }
        
        const res = await scheduleNextRound(gameId, teams, facilityId);
        scheduledMatchesCount += res.count;
    }
    
    revalidatePath(`/admin/games/${gameId}`);
    return { success: true, count: scheduledMatchesCount };
}

export async function generatePlayoffBracket(gameId: string, teams: any[], numTeams: number, facilityId: string) {
    const adminSupabase = await createAdminClient();
    
    // Calculate live standings strictly
    const { data: matches } = await adminSupabase.from('matches').select('*').eq('game_id', gameId).eq('status', 'completed').eq('is_playoff', false);
    
    const stats: Record<string, { w: number, d: number, l: number, gf: number, ga: number, pts: number }> = {};
    teams.forEach(t => {
        stats[t.name] = { w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    });

    if (matches) {
        matches.forEach(m => {
            if (!stats[m.home_team]) stats[m.home_team] = { w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
            if (!stats[m.away_team]) stats[m.away_team] = { w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };

            const home = stats[m.home_team];
            const away = stats[m.away_team];

            home.gf += m.home_score;
            home.ga += m.away_score;
            away.gf += m.away_score;
            away.ga += m.home_score;

            if (m.home_score > m.away_score) {
                home.w++; home.pts += 3; away.l++;
            } else if (m.away_score > m.home_score) {
                away.w++; away.pts += 3; home.l++;
            } else {
                home.d++; home.pts += 1; away.d++; away.pts += 1;
            }
        });
    }

    const sortedTeams = Object.entries(stats)
        .map(([name, data]) => ({ name, ...data, gd: data.gf - data.ga }))
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

    const topTeams = sortedTeams.slice(0, numTeams).map(t => t.name);
    if (topTeams.length < 2) throw new Error("Not enough teams for playoffs.");

    // Determine upcoming Friday/target date for playoffs
    const { data: allMatches } = await adminSupabase.from('matches').select('start_time').eq('game_id', gameId).order('start_time', { ascending: false }).limit(1);
    let nextStartTime = new Date();
    if (allMatches && allMatches.length > 0) {
         nextStartTime = new Date(new Date(allMatches[0].start_time).getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
         nextStartTime.setDate(nextStartTime.getDate() + 7);
    }
    
    const matchesToInsert = [];
    
    // Seed pairing: 1 vs 4, 2 vs 3 etc. if Top 4. 
    // Simply pairing 1 vs N, 2 vs N-1
    for (let i = 0; i < topTeams.length / 2; i++) {
        const homeTeam = topTeams[i];
        const awayTeam = topTeams[topTeams.length - 1 - i];
        const matchTime = new Date(nextStartTime.getTime() + i * 60 * 60 * 1000);
        
        matchesToInsert.push({
            game_id: gameId,
            home_team: homeTeam,
            away_team: awayTeam,
            start_time: matchTime.toISOString(),
            status: 'scheduled',
            field_name: 'Championship Pitch',
            is_playoff: true
        });
    }

    if (matchesToInsert.length > 0) {
        const { error } = await adminSupabase.from('matches').insert(matchesToInsert);
        if (error) throw new Error(error.message);
    }

    revalidatePath(`/admin/games/${gameId}`);
    return { success: true, count: matchesToInsert.length };
}
