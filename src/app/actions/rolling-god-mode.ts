'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { checkOverlap } from './league-actions';

/**
 * Creates a team manually.
 */
export async function updateSchedulingConstraints(gameId: string, constraints: { 
    amount_of_fields: number, 
    earliest_game_start_time: string, 
    latest_game_start_time: string,
    half_length?: number,
    halftime_length?: number,
    break_between_games?: number,
    total_game_time?: number
}) {
    const adminSupabase = await createAdminClient();
    const updatePayload: any = {
        amount_of_fields: constraints.amount_of_fields,
        earliest_game_start_time: constraints.earliest_game_start_time || null,
        latest_game_start_time: constraints.latest_game_start_time || null
    };

    if (constraints.half_length !== undefined) updatePayload.half_length = constraints.half_length;
    if (constraints.halftime_length !== undefined) updatePayload.halftime_length = constraints.halftime_length;
    if (constraints.break_between_games !== undefined) updatePayload.break_between_games = constraints.break_between_games;
    if (constraints.total_game_time !== undefined) updatePayload.total_game_time = constraints.total_game_time;

    const { error } = await adminSupabase.from('games').update(updatePayload).eq('id', gameId);
    if (error) throw new Error(error.message);
    revalidatePath(`/admin/games/${gameId}`);
    return { success: true };
}

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
export async function updateTeamDetails(teamId: string, gameId: string, updates: { name?: string; captain_id?: string | null }) {
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
export async function logPastMatch(gameId: string, homeTeamId: string, homeTeamName: string, awayTeamId: string, awayTeamName: string, homeScore: number, awayScore: number, dateString: string) {
    const adminSupabase = await createAdminClient();
    
    const { error } = await adminSupabase.from('matches').insert({
        game_id: gameId,
        home_team_id: homeTeamId,
        home_team: homeTeamName,
        away_team_id: awayTeamId,
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
 * Permanently deletes a match from the database.
 */
export async function deleteMatchPermanently(matchId: string, gameId: string) {
    const adminSupabase = await createAdminClient();
    
    const { error } = await adminSupabase
        .from('matches')
        .delete()
        .eq('id', matchId);

    if (error) throw new Error(`Failed to delete match: ${error.message}`);

    revalidatePath(`/admin/games/${gameId}`);
    return { success: true };
}

export async function deleteBulkMatches(matchIds: string[], gameId: string) {
    const adminSupabase = await createAdminClient();
    const { error } = await adminSupabase
        .from('matches')
        .delete()
        .in('id', matchIds);

    if (error) throw new Error(`Failed to delete matches: ${error.message}`);

    revalidatePath(`/admin/games/${gameId}`);
    return { success: true };
}

export async function deleteAllMatches(gameId: string) {
    const adminSupabase = await createAdminClient();
    const { error } = await adminSupabase
        .from('matches')
        .delete()
        .eq('game_id', gameId);

    if (error) throw new Error(`Failed to delete all matches: ${error.message}`);

    revalidatePath(`/admin/games/${gameId}`);
    return { success: true };
}

/**
 * Calculates pairings and schedules the next rolling round.
 * Moved from league-actions to be specific to Rolling Manager.
 */
export async function scheduleNextRound(leagueId: string, teams: any[], facilityId: string, tzOffset: number = 0) {
    const adminSupabase = await createAdminClient();
    
    // Fetch parent Game Config
    const { data: game, error: gameError } = await adminSupabase.from('games').select('*').eq('id', leagueId).single();
    if (!game) throw new Error("Game configuration not found");

    // Fetch existing matches
    const { data: matches } = await adminSupabase.from('matches').select('start_time, home_team_id, away_team_id, home_team, away_team').eq('game_id', leagueId);
    
    // Target Date Determination using local-equivalent UTC math
    const applyLocalOffset = (d: Date) => new Date(d.getTime() - tzOffset * 60000);
    const removeLocalOffset = (d: Date) => new Date(d.getTime() + tzOffset * 60000);

    const gameStartDateTime = applyLocalOffset(new Date(game.start_time));
    const targetDayOfWeek = gameStartDateTime.getUTCDay();
    let targetDate = new Date(gameStartDateTime);
    
    if (matches && matches.length > 0) {
        const lastMatchTime = matches.reduce((latest, m) => {
            const mTime = applyLocalOffset(new Date(m.start_time)).getTime();
            return mTime > latest ? mTime : latest;
        }, 0);
        
        targetDate = new Date(lastMatchTime);
        targetDate.setUTCDate(targetDate.getUTCDate() + 1); // Start checking the day after the latest match
        
        // Advance until the day of the week matches the original game day
        while (targetDate.getUTCDay() !== targetDayOfWeek) {
            targetDate.setUTCDate(targetDate.getUTCDate() + 1);
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
            targetDate.setUTCDate(targetDate.getUTCDate() + 1);
            while (targetDate.getUTCDay() !== targetDayOfWeek) {
                targetDate.setUTCDate(targetDate.getUTCDate() + 1);
            }
        } else {
            foundValidDate = true;
        }
    }

    if (safetyCounter >= 52) {
        throw new Error("Schedule generation failed: Exceeded maximum blackout evasion loop check.");
    }
    
    // Track previous matchups using a scoring model instead of simple Set
    interface TeamStats {
        id: string;
        playStreak: number;
        sitStreak: number;
        totalPlayed: number;
        totalSat: number;
        playedOpponents: Map<string, number>;
        lastOpponent: string | null;
        originalTeam: any;
    }

    const teamStatsMap = new Map<string, TeamStats>();
    teams.forEach(t => {
        teamStatsMap.set(t.id, {
            id: t.id,
            playStreak: 0,
            sitStreak: 0,
            totalPlayed: 0,
            totalSat: 0,
            playedOpponents: new Map<string, number>(),
            lastOpponent: null,
            originalTeam: t
        });
    });

    if (matches && matches.length > 0) {
        // Sort matches chronologically to accurately track "lastOpponent"
        const sortedMatches = [...matches].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        
        sortedMatches.forEach(m => {
            const hId = m.home_team_id;
            const aId = m.away_team_id;
            
            if (hId && teamStatsMap.has(hId)) {
                const stat = teamStatsMap.get(hId)!;
                stat.totalPlayed++;
                if (aId) {
                    const current = stat.playedOpponents.get(aId) || 0;
                    stat.playedOpponents.set(aId, current + 1);
                    stat.lastOpponent = aId;
                }
            }
            if (aId && teamStatsMap.has(aId)) {
                const stat = teamStatsMap.get(aId)!;
                stat.totalPlayed++;
                if (hId) {
                    const current = stat.playedOpponents.get(hId) || 0;
                    stat.playedOpponents.set(hId, current + 1);
                    stat.lastOpponent = hId;
                }
            }
        });
    }

    const teamStats = Array.from(teamStatsMap.values());
    
    // Shuffle teamStats to break deterministic ties
    // This prevents the same teams from always getting byes or picking opponents first
    const shuffledStats = [...teamStats];
    for (let i = shuffledStats.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledStats[i], shuffledStats[j]] = [shuffledStats[j], shuffledStats[i]];
    }
    
    // Determine who sits if odd number of teams
    // Priority to sit: Fewest total sat (aka most games played)
    const sortedForSitting = [...shuffledStats].sort((a, b) => {
        if (a.totalSat !== b.totalSat) return a.totalSat - b.totalSat;
        if (b.playStreak !== a.playStreak) return b.playStreak - a.playStreak;
        return a.totalPlayed - b.totalPlayed; // fallback
    });

    // maxTeamsThatCanPlay must be an even number
    const maxTeamsThatCanPlay = teams.length - (teams.length % 2 !== 0 ? 1 : 0);
    const numSitting = teams.length - maxTeamsThatCanPlay;
    
    const playingTeamsPool = sortedForSitting.slice(numSitting); // drop the first `numSitting` teams

    // Sort playing pool by priority to play (played least)
    // Because JS sort is stable, tied teams will remain in their randomized relative order!
    playingTeamsPool.sort((a, b) => {
        if (a.sitStreak !== b.sitStreak) return b.sitStreak - a.sitStreak;
        return a.totalPlayed - b.totalPlayed;
    });

    const pairings: [any, any][] = [];
    const matched = new Set<string>();

    for (const t1 of playingTeamsPool) {
        if (matched.has(t1.id)) continue;
        
        let bestOpponent: TeamStats | null = null;
        let bestOpponentScore = -9999;

        for (const t2 of playingTeamsPool) {
            if (t1.id === t2.id || matched.has(t2.id)) continue;
            
            let score = 0;
            const timesPlayed = t1.playedOpponents.get(t2.id) || 0;
            score -= timesPlayed * 100; // Familiarity penalty
            
            score -= t2.totalPlayed * 5; // keep games balanced
            
            // Back-to-back penalty
            if (t1.lastOpponent === t2.id || t2.lastOpponent === t1.id) {
                score -= 1000;
            }
            
            if (score > bestOpponentScore) {
                bestOpponentScore = score;
                bestOpponent = t2;
            }
        }

        // Fallback if no score was generated somehow
        if (!bestOpponent) {
            bestOpponent = playingTeamsPool.find(t => t.id !== t1.id && !matched.has(t.id)) ?? null;
        }

        if (bestOpponent) {
            pairings.push([t1.originalTeam, bestOpponent.originalTeam]);
            matched.add(t1.id);
            matched.add(bestOpponent.id);
        }
    }

    // Generate accurate Time Matrix starting at boundaries
    if (game.earliest_game_start_time) {
        const [hours, mins] = game.earliest_game_start_time.split(':');
        targetDate.setUTCHours(parseInt(hours), parseInt(mins), 0, 0);
    } else {
        targetDate.setUTCHours(gameStartDateTime.getUTCHours(), gameStartDateTime.getUTCMinutes(), 0, 0);
    }
    
    // Parse the strict end time from string (e.g. "22:00:00")
    let gameEndTimeLimit = null;
    const endLimitString = game.latest_game_start_time || game.end_time;
    if (endLimitString) {
        const [hours, mins] = endLimitString.split(':');
        gameEndTimeLimit = new Date(targetDate);
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

        // Safety enforcement: Do not exceed end barrier
        if (gameEndTimeLimit && currentMatrixTime > gameEndTimeLimit) {
            throw new Error(`Schedule overflow: Not enough physical field capacity to schedule all matchups before the mandatory end limit of ${endLimitString}.`);
        }
        
        matchesToInsert.push({
            game_id: leagueId,
            home_team: pairings[i][0].name,
            home_team_id: pairings[i][0].id,
            away_team: pairings[i][1].name,
            away_team_id: pairings[i][1].id,
            start_time: removeLocalOffset(currentMatrixTime).toISOString(),
            status: 'scheduled',
            field_name: fieldNames[currentFieldIndex] || `Field ${currentFieldIndex + 1}`
        });

        currentFieldIndex++;
    }

    if (matchesToInsert.length > 0) {
        const { error } = await adminSupabase.from('matches').insert(matchesToInsert);
        if (error) throw new Error(error.message);
    }

    const byeTeam = numSitting > 0 ? sortedForSitting[0].originalTeam : null;
    
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
        .select('total_cash_collected, user_id')
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

    // If we are marking as unpaid, also undo their check-in so systems stay in sync
    if (!isPaid && reg.user_id) {
        await adminSupabase
            .from('event_check_ins')
            .delete()
            .eq('user_id', reg.user_id)
            .eq('event_id', gameId);
    }

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

export async function bulkScheduleSeason(gameId: string, teams: any[], facilityId: string, endDateStr: string, tzOffset: number = 0) {
    try {
        const adminSupabase = await createAdminClient();
        
        // Parse end date limit
        const limitDate = new Date(endDateStr);
        let scheduledMatchesCount = 0;
        
        for (let round = 0; round < 12; round++) {
            const { data: matches } = await adminSupabase.from('matches').select('start_time').eq('game_id', gameId).order('start_time', { ascending: false }).limit(1);
            
            let nextStartEstimate = new Date();
            if (matches && matches.length > 0) {
                // Approximate +7 days for the next match boundary to check against the limit
                nextStartEstimate = new Date(new Date(matches[0].start_time).getTime() + (7 * 24 * 60 * 60 * 1000));
            }
            
            if (nextStartEstimate > limitDate) {
                break;
            }
            
            const res = await scheduleNextRound(gameId, teams, facilityId, tzOffset);
            scheduledMatchesCount += res.count;
        }
        
        revalidatePath(`/admin/games/${gameId}`);
        return { success: true, count: scheduledMatchesCount };
    } catch (e: any) {
        return { success: false, error: e.message || 'Unknown error occurred in bulkScheduleSeason' };
    }
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

// -------------------------------------------------------------
// ADVANCED PLAYER MANAGEMENT (BANS, MANUAL ADDS, ETC)
// -------------------------------------------------------------

export async function searchProfiles(query: string) {
    const adminSupabase = await createAdminClient();
    const { data, error } = await adminSupabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);
        
    if (error) throw new Error(`Search failed: ${error.message}`);
    return { success: true, profiles: data || [] };
}

export async function addManualPlayer(gameId: string, teamId: string, userId: string) {
    const adminSupabase = await createAdminClient();
    
    // Check if already registered
    const { data: existing } = await adminSupabase
        .from('tournament_registrations')
        .select('id')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .single();
        
    if (existing) {
        throw new Error("This user is already registered for this league.");
    }
    
    const { error } = await adminSupabase
        .from('tournament_registrations')
        .insert({
            game_id: gameId,
            user_id: userId,
            team_id: teamId,
            status: 'registered',
            role: 'player',
            payment_status: 'comped' // Assume manually verified if added by admin
        });
        
    if (error) throw new Error(`Failed to add player: ${error.message}`);
    
    revalidatePath(`/admin/games/${gameId}`);
    return { success: true };
}

export async function moveToFreeAgency(registrationId: string, gameId: string) {
    const adminSupabase = await createAdminClient();
    const { error } = await adminSupabase
        .from('tournament_registrations')
        .update({ team_id: null })
        .eq('id', registrationId);
        
    if (error) throw new Error(`Failed to move to free agency: ${error.message}`);
    
    revalidatePath(`/admin/games/${gameId}`);
    return { success: true };
}

export async function removeFromLeague(registrationId: string, gameId: string) {
    const adminSupabase = await createAdminClient();
    // Using soft cancellation
    const { error } = await adminSupabase
        .from('tournament_registrations')
        .update({ status: 'cancelled', team_id: null })
        .eq('id', registrationId);
        
    if (error) throw new Error(`Failed to remove player: ${error.message}`);
    
    revalidatePath(`/admin/games/${gameId}`);
    return { success: true };
}

export async function issuePermanentBan(registrationId: string, gameId: string) {
    const adminSupabase = await createAdminClient();
    // Ban from this specific league
    const { error } = await adminSupabase
        .from('tournament_registrations')
        .update({ status: 'banned', team_id: null })
        .eq('id', registrationId);
        
    if (error) throw new Error(`Failed to ban player: ${error.message}`);
    
    revalidatePath(`/admin/games/${gameId}`);
    return { success: true };
}

export async function issueSoftBan(userId: string, teamId: string, gameId: string, numGames: number) {
    const adminSupabase = await createAdminClient();
    
    // Find upcoming games for the team
    const { data: upcomingMatches, error: matchError } = await adminSupabase
        .from('matches')
        .select('id')
        .eq('game_id', gameId)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .in('status', ['scheduled', 'active'])
        .order('start_time', { ascending: true })
        .limit(numGames);
        
    if (matchError) throw new Error(`Failed to find upcoming matches: ${matchError.message}`);
    
    if (!upcomingMatches || upcomingMatches.length === 0) {
        throw new Error("No upcoming matches found for this team to ban them from.");
    }
    
    const suspensions = upcomingMatches.map(m => ({
        match_id: m.id,
        user_id: userId,
        reason: `${numGames} Game Soft Ban`
    }));
    
    const { error } = await adminSupabase
        .from('match_suspensions')
        .insert(suspensions);
        
    if (error) throw new Error(`Failed to issue suspension: ${error.message}`);
    
    revalidatePath(`/admin/games/${gameId}`);
    return { success: true, suspendedMatches: upcomingMatches.length };
}
