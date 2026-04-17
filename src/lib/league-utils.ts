/**
 * Utility to determine if a league or tournament is locked from public registration / team modifications.
 * Safely handles timezone conversions by relying on native Date parsing of ISO strings.
 */
export function isLeagueLocked(game: any): boolean {
    if (!game) return false;

    // 1. Hard Admin Override
    if (game.accepting_registrations === false) {
        return true;
    }

    const now = Date.now();

    // 2. Rolling League / Updated Structure Cutoff
    if (game.registration_cutoff) {
        const cutoffTime = new Date(game.registration_cutoff).getTime();
        // Fallback safety if DB string is invalid
        if (!isNaN(cutoffTime) && now > cutoffTime) {
            return true;
        }
    }

    // 3. Legacy Structured League Support
    if (game.roster_lock_date) {
        const lockTime = new Date(game.roster_lock_date).getTime();
        if (!isNaN(lockTime) && now > lockTime) {
            return true;
        }
    }

    return false;
}
