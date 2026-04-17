/**
 * 🏗️ Architecture: [[RollingLeague.md]]
 * Logic for calculating the "Virtual Next Match" date for autopilot leagues.
 */

export interface RollingLifecycleGame {
    start_time: string;
    lifecycle_status?: 'active' | 'paused' | 'completed';
    lifecycle_end_date?: string | null;
    skipped_dates?: string[];
}

export interface MatchResult {
    status: 'active' | 'paused' | 'concluded';
    date: string | null; // ISO String
}

/**
 * Calculates the next valid match date based on a rolling weekly schedule.
 */
export function calculateNextMatch(game: RollingLifecycleGame): MatchResult {
    const projections = calculateProjectedMatches(game, 1);
    
    if (game.lifecycle_status === 'completed') return { status: 'concluded', date: null };
    if (game.lifecycle_status === 'paused') return { status: 'paused', date: null };
    if (projections.length === 0) return { status: 'concluded', date: null };

    return { status: 'active', date: projections[0] };
}

/**
 * Generates an array of future valid match dates.
 * Handle:
 * 1. Automatic rollover.
 * 2. Skipping specific dates.
 * 3. Lifecycle boundaries.
 * 
 * @param game The lifecycle settings.
 * @param count Number of matches to project.
 * @param afterDate Optional date to start projecting from (Phase Shift Seam).
 */
export function calculateProjectedMatches(
    game: RollingLifecycleGame, 
    count: number = 8,
    afterDate?: string | null
): string[] {
    const { 
        start_time, 
        lifecycle_status = 'active', 
        lifecycle_end_date, 
        skipped_dates = [] 
    } = game;

    if (lifecycle_status === 'completed' || lifecycle_status === 'paused') {
        return [];
    }

    const start = new Date(start_time);
    const targetDay = start.getDay();
    const targetHours = start.getHours();
    const targetMinutes = start.getMinutes();

    // The starting point for our search
    // If afterDate is provided (e.g. date of last concrete match), we start from there.
    // Otherwise, we start from "Now".
    let searchFrom = afterDate ? new Date(afterDate) : new Date();
    
    // Safety check: candidate must be at least "Now" even if afterDate is in the past
    if (searchFrom < new Date()) {
        searchFrom = new Date();
    }

    let candidate = new Date(searchFrom.getTime());
    candidate.setHours(targetHours, targetMinutes, 0, 0);

    // Initial alignment to the correct weekday
    const currentDay = candidate.getDay();
    let daysUntil = (targetDay - currentDay + 7) % 7;

    // RULE: If it's the target day but the match time (plus grace period) has passed, move to next week
    const gracePeriodMs = 2 * 60 * 60 * 1000;
    if (daysUntil === 0 && new Date() > new Date(candidate.getTime() + gracePeriodMs)) {
        daysUntil = 7;
    }
    
    // If we are starting from an 'afterDate', we definitely move to the next occurrence
    if (afterDate && daysUntil === 0) {
        daysUntil = 7;
    }

    candidate.setDate(candidate.getDate() + daysUntil);

    const projectedDates: string[] = [];
    let attempts = 0;
    while (projectedDates.length < count && attempts < 52) {
        const dateStr = candidate.toISOString().split('T')[0];

        // Check 1: Season End
        if (lifecycle_end_date && candidate > new Date(lifecycle_end_date)) {
            break;
        }

        // Check 2: Skip Dates
        if (skipped_dates.includes(dateStr)) {
            candidate.setDate(candidate.getDate() + 7);
            attempts++;
            continue;
        }

        projectedDates.push(candidate.toISOString());
        candidate.setDate(candidate.getDate() + 7);
        attempts++;
    }

    return projectedDates;
}
