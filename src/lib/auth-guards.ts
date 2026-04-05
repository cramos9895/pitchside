import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type AuthUser = {
    id: string;
    role: string;
    system_role: string;
    facility_id: string | null;
};

/**
 * Validates that the current user is logged in and returns their PitchSide profile.
 */
export async function getAuthenticatedProfile(): Promise<AuthUser> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized: No active session found.');

    const adminSupabase = createAdminClient();
    const { data: profile, error } = await adminSupabase
        .from('profiles')
        .select('id, role, system_role, facility_id')
        .eq('id', user.id)
        .single();

    if (error || !profile) throw new Error('Unauthorized: Profile not found.');

    return profile;
}

/**
 * Ensures the user has authority over a specific facility.
 * Passable for Master Admins or the specific Facility Admin.
 */
export function validateFacilityAuthority(profile: AuthUser, facilityId: string) {
    const isMaster = profile.role === 'master_admin' || profile.system_role === 'super_admin';
    const isTargetHost = profile.facility_id === facilityId;

    if (!isMaster && !isTargetHost) {
        throw new Error('Forbidden: You do not have permission to manage this facility.');
    }
}

/**
 * Ensures the user has authority over a specific game/event.
 * Fetches the game context and compares facility ownership.
 */
export async function validateGameAuthority(profile: AuthUser, gameId: string) {
    const isMaster = profile.role === 'master_admin' || profile.system_role === 'super_admin';
    if (isMaster) return;

    const adminSupabase = createAdminClient();
    const { data: game, error } = await adminSupabase
        .from('games')
        .select('facility_id')
        .eq('id', gameId)
        .single();

    if (error || !game) throw new Error('Game not found.');

    if (profile.facility_id !== game.facility_id) {
        throw new Error('Forbidden: This game does not belong to your facility.');
    }
}

/**
 * Ensures the user is the Captain of a specific team in a tournament/league.
 */
export async function validateCaptaincy(userId: string, teamId: string) {
    const supabase = await createClient();
    const { data: registration, error } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .eq('role', 'captain')
        .single();

    if (error || !registration) {
        throw new Error('Forbidden: Only the team captain can perform this action.');
    }
}
