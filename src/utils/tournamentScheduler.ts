/**
 * Pitchside Native Tournament Engine
 * Pure math abstraction mapping scheduling logic against physical time capacities.
 */

export interface Team {
    name: string;
    color?: string;
    limit?: number;
}

export interface DraftMatch {
    id: string; // Temporary ID for React state mapping
    home_team: string; // Team A
    away_team: string; // Team B
    start_time: string; // ISO String
    field_name: string; // e.g. "Field 1"
    is_playoff: boolean;
    round_number: number;
    group_name?: string;
}

interface SchedulerParams {
    teams: Team[];
    amountOfFields: number;
    halfLength: number;
    halftimeLength: number;
    breakBetweenGames: number;
    earliestStartTime: string;
    endTime: string;
    tournamentStyle: 'group_stage' | 'single_elimination' | 'double_elimination';
    minGamesPerTeam: number;
}

/**
 * Validates the time limits and routes to the correct tournament generator.
 */
export function generateTournamentSchedule({
    teams,
    amountOfFields,
    halfLength,
    halftimeLength,
    breakBetweenGames,
    earliestStartTime,
    endTime,
    tournamentStyle,
    minGamesPerTeam
}: SchedulerParams): DraftMatch[] {
    if (!teams || teams.length < 2) return [];

    // --- PHASE 1: CAPACITY MATHEMATICS ---
    const start = new Date(earliestStartTime);
    let end = new Date(earliestStartTime);
    
    // Pitchside stores end_time natively as a time string (e.g. "23:00" or "23:00:00")
    if (endTime.includes(':')) {
        const [hours, minutes] = endTime.split(':').map(Number);
        end.setHours(hours, minutes, 0, 0);
    } else {
        end = new Date(endTime);
    }
    
    // Cross-midnight logic (e.g. 6PM to 2AM)
    if (end < start) {
        end.setDate(end.getDate() + 1);
    }
    
    const totalAvailableMinutes = (end.getTime() - start.getTime()) / 60000;
    const slotDurationMinutes = (halfLength * 2) + halftimeLength + breakBetweenGames;
    
    const maxMatchSlotsPerField = Math.floor(totalAvailableMinutes / slotDurationMinutes);
    const absoluteCapacity = maxMatchSlotsPerField * amountOfFields;

    let matchMatrix: { home: string, away: string, is_playoff?: boolean, group_name?: string }[] = [];

    // --- PHASE 2: ALGORITHM ROUTING ---
    if (tournamentStyle === 'group_stage') {
        matchMatrix = buildGroupStageMatrix(teams, minGamesPerTeam);
    } else if (tournamentStyle === 'single_elimination') {
        matchMatrix = buildSingleEliminationMatrix(teams);
    } else if (tournamentStyle === 'double_elimination') {
        throw new Error("Double Elimination logic is under active development. Please select Single Elimination.");
    }

    // --- PHASE 3: CAPACITY BLOCKER ---
    if (matchMatrix.length > absoluteCapacity) {
        throw new Error(`Mathematical Impossibility: You are attempting to schedule ${matchMatrix.length} matches, but your timeframe (${totalAvailableMinutes} mins / ${amountOfFields} fields) only supports exactly ${absoluteCapacity} matches. Please increase your fields, extend the end time, shorten match halves, or reduce the minimum guaranteed games.`);
    }

    // --- PHASE 4: TIME & FIELD ASSIGNMENT ---
    const draftSchedule: DraftMatch[] = [];
    let currentStartTime = new Date(start);
    let currentFieldIndex = 1;
    let currentRound = 1;

    for (let i = 0; i < matchMatrix.length; i++) {
        const match = matchMatrix[i];

        draftSchedule.push({
            id: `draft_${i}_${Date.now()}`,
            home_team: match.home,
            away_team: match.away,
            start_time: currentStartTime.toISOString(),
            field_name: `Field ${currentFieldIndex}`,
            is_playoff: match.is_playoff || false,
            round_number: currentRound,
            group_name: match.group_name
        });

        currentFieldIndex++;

        // Saturation Check: If all fields are occupied for this slot, increment real time clock.
        if (currentFieldIndex > amountOfFields) {
            currentFieldIndex = 1;
            currentStartTime = new Date(currentStartTime.getTime() + slotDurationMinutes * 60000);
            currentRound++;
        }
    }

    return draftSchedule;
}


/**
 * HELPER: Generates a grouped round-robin matrix hitting an exact quota.
 */
function buildGroupStageMatrix(teams: Team[], minGames: number) {
    let allMatches: { home: string, away: string, is_playoff?: boolean, group_name?: string }[] = [];

    // 1. Group Division Logic
    const groups: { name: string, teams: string[] }[] = [];
    if (teams.length > 5) {
        const mid = Math.ceil(teams.length / 2);
        groups.push({ name: 'Group A', teams: teams.slice(0, mid).map(t => t.name) });
        groups.push({ name: 'Group B', teams: teams.slice(mid).map(t => t.name) });
    } else {
        groups.push({ name: 'Group A', teams: teams.map(t => t.name) });
    }

    // 2. Generate matches per group
    const generator = (group: string[], groupName: string) => {
        const subset: { home: string, away: string, group_name: string }[] = [];
        let rTeams = [...group];
        const hasBye = rTeams.length % 2 !== 0;
        if (hasBye) rTeams.push("BYE");

        const n = rTeams.length;
        const maxPossible = n - 1;
        if (minGames > maxPossible) {
            throw new Error(`Mathematical Limit: With ${group.length} teams in ${groupName}, the maximum unique games is ${maxPossible}. Your requested minimum of ${minGames} is physically impossible.`);
        }
        const matchesPerRound = n / 2;
        
        const pivot = rTeams[0];
        let rotating = rTeams.slice(1);

        for (let round = 0; round < minGames; round++) {
            const teamA = pivot;
            const teamB = rotating[rotating.length - 1];
            
            if (teamA !== "BYE" && teamB !== "BYE") subset.push({ home: teamA, away: teamB, group_name: groupName });

            for (let i = 0; i < matchesPerRound - 1; i++) {
                const h = rotating[i];
                const a = rotating[rotating.length - 2 - i];
                if (h !== "BYE" && a !== "BYE") subset.push({ home: h, away: a, group_name: groupName });
            }

            const lastEl = rotating.pop()!;
            rotating.unshift(lastEl);
        }
        return subset;
    };

    groups.forEach(g => {
        allMatches.push(...generator(g.teams, g.name));
    });

    // NOTE: Playoff matches are no longer added here. 
    // They are generated manually via handleGeneratePlayoffs in MicroTournamentManager.tsx

    return allMatches;
}


/**
 * HELPER: Generates a pure knockout bracket counting total raw matches natively.
 */
function buildSingleEliminationMatrix(teams: Team[]) {
    // A pure Single Elimination bracket requires precisely (N-1) matches.
    // Instead of building a complex geometric tree, we just output the required match rounds sequentially.
    let remainingTeams = teams.map(t => t.name);
    let allMatches: { home: string, away: string, is_playoff?: boolean }[] = [];

    // Find the nearest power of 2
    let power = 1;
    while (power < remainingTeams.length) power *= 2;
    
    // Play-in matches (Byes)
    const numByes = power - remainingTeams.length;
    const numPlayins = remainingTeams.length - numByes; // The teams that actually play Round 1
    
    let matchIdx = 1;
    
    // Round 1 (Play-Ins)
    let playinWinners = [];
    for (let i = 0; i < numPlayins; i += 2) {
        allMatches.push({ home: remainingTeams[i], away: remainingTeams[i + 1], is_playoff: true });
        playinWinners.push(`Winner Match ${matchIdx}`);
        matchIdx++;
    }
    
    const byeTeams = remainingTeams.slice(numPlayins);
    let round2Pool = [...byeTeams, ...playinWinners];
    
    // Proceeding Knockout Rounds
    while (round2Pool.length > 1) {
        let nextPool = [];
        for (let i = 0; i < round2Pool.length; i += 2) {
            allMatches.push({ home: round2Pool[i], away: round2Pool[i + 1], is_playoff: true });
            if (round2Pool.length === 2) {
                // Championship!
            } else {
                nextPool.push(`Winner Match ${matchIdx}`);
            }
            matchIdx++;
        }
        round2Pool = nextPool;
    }

    return allMatches;
}

export function calculateStandings(teams: { name: string }[], matches: any[]) {
    const stats: Record<string, { gp: number, w: number, d: number, l: number, gf: number, ga: number, pts: number }> = {};

    // Initialize
    teams.forEach(t => {
        stats[t.name] = { gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    });

    // Compute - ONLY for completed matches
    matches.filter(m => m.status === 'completed').forEach(m => {
        if (!stats[m.home_team]) stats[m.home_team] = { gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
        if (!stats[m.away_team]) stats[m.away_team] = { gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };

        const home = stats[m.home_team];
        const away = stats[m.away_team];

        home.gp++;
        away.gp++;
        home.gf += m.home_score;
        home.ga += m.away_score;
        away.gf += m.away_score;
        away.ga += m.home_score;

        if (m.home_score > m.away_score) {
            home.w++;
            home.pts += 3;
            away.l++;
        } else if (m.away_score > m.home_score) {
            away.w++;
            away.pts += 3;
            home.l++;
        } else {
            home.d++;
            home.pts += 1;
            away.d++;
            away.pts += 1;
        }
    });

    return Object.entries(stats)
        .map(([name, data]) => ({ name, ...data, gd: data.gf - data.ga }))
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}
