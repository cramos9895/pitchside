'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { isLeagueLocked } from '@/lib/league-utils';

/**
 * 🏗️ Architecture: [[RollingLeagueLobby.md]]
 * Handles registration for match-based "Rolling Leagues" which live in the 'games' table.
 */

export async function registerRollingCaptain(formData: FormData) {
    const supabase = await createClient();
    
    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // 2. Extract form data
    const gameId = formData.get('leagueId') as string;
    const teamName = formData.get('teamName') as string;
    const primaryColor = formData.get('primaryColor') as string;
    const positionsRaw = formData.get('positions') as string;
    let positions: string[] = [];

    try {
        positions = positionsRaw ? JSON.parse(positionsRaw) : [];
    } catch (e) {
        console.error("Failed to parse positions:", e);
    }
    
    if (!gameId || !teamName) throw new Error("Missing required fields");

    // 3. Validation: Check registration status in 'games' table
    const { data: game, error: gameError } = await supabase
        .from('games')
        .select('status, roster_lock_date, registration_cutoff, accepting_registrations, payment_collection_type')
        .eq('id', gameId)
        .single();

    if (gameError || !game) throw new Error("League / Match not found");
    if (game.status === 'cancelled' || game.status === 'completed') {
        throw new Error("This league is no longer accepting registrations");
    }

    if (isLeagueLocked(game)) {
        throw new Error("This league is locked. Registration and team joins are closed.");
    }



    // 4. Create new team linked to GAME
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
            game_id: gameId,
            name: teamName,
            captain_id: user.id,
            primary_color: primaryColor,
            accepting_free_agents: false,
            status: 'approved'
        })
        .select()
        .single();

    if (teamError || !team) throw new Error("Failed to create team: " + teamError?.message);

    // 5. Register user to tournament_registrations linked to GAME
    // CRITICAL: Strict upsert to handle re-joining after previous withdrawal
    const { error: regError } = await supabase
        .from('tournament_registrations')
        .upsert({
            game_id: gameId,
            user_id: user.id,
            team_id: team.id,
            role: 'captain',
            preferred_positions: positions,
            status: 'registered'
        }, { onConflict: 'game_id,user_id' });

    if (regError) {
        await supabase.from('teams').delete().eq('id', team.id);
        throw new Error("Failed to create registration: " + regError.message);
    }

    revalidatePath(`/games/${gameId}`);
    return { success: true, teamId: team.id };
}

export async function registerRollingFreeAgent(formData: FormData) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const gameId = formData.get('leagueId') as string;
    const positionsRaw = formData.get('positions') as string;
    let positions: string[] = [];

    try {
        positions = positionsRaw ? JSON.parse(positionsRaw) : [];
    } catch (e) {
        console.error("Failed to parse positions:", e);
    }
    
    if (!gameId || positions.length === 0) {
        throw new Error("Missing required fields. Please select at least one position.");
    }

    // Validation
    const { data: game, error: gameError } = await supabase
        .from('games')
        .select('status, roster_lock_date, registration_cutoff, accepting_registrations')
        .eq('id', gameId)
        .single();

    if (gameError || !game) throw new Error("League / Match not found");
    if (game.status === 'cancelled' || game.status === 'completed') {
        throw new Error("This league is no longer accepting registrations");
    }

    if (isLeagueLocked(game)) {
        throw new Error("This league is locked. Registration and team joins are closed.");
    }

    // Register Free Agent to GAME
    // CRITICAL: Strict upsert to handle re-joining after previous withdrawal
    const { error: regError } = await supabase
        .from('tournament_registrations')
        .upsert({
            game_id: gameId,
            user_id: user.id,
            team_id: null, // Reset team_id to FA pool
            role: 'player', // Reset role to standard player/FA
            preferred_positions: positions,
            status: 'registered'
        }, { onConflict: 'game_id,user_id' });

    if (regError) {
        console.error('Rolling Registration error:', regError);
        throw new Error(regError.message);
    }

    revalidatePath(`/games/${gameId}`);
    return { success: true };
}

/**
 * [SOFT DELETE] Withdraw from a Rolling League pool entirely.
 * Preserves audit trail for Stripe by updating status instead of deleting.
 */
export async function withdrawFromRollingLeague(gameId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
        .from('tournament_registrations')
        .update({ 
            status: 'cancelled',
            team_id: null // Release from any team if they were assigned
        })
        .eq('game_id', gameId)
        .eq('user_id', user.id);

    if (error) throw new Error(error.message);

    // STRIPE HOOK: If the user paid a season fee, initiate refund logic here.
    // For cash-at-door events, no refund is necessary.

    revalidatePath(`/games/${gameId}`);
    return { success: true };
}

/**
 * [SOFT DELETE] Leave a team and return to the Free Agent pool.
 * Does not delete the registration, just nullifies the relationship.
 */
export async function leaveRollingTeam(gameId: string, teamId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
        .from('tournament_registrations')
        .update({ 
            team_id: null,
            status: 'registered' // Returns them to the open draft pool
        })
        .eq('game_id', gameId)
        .eq('team_id', teamId)
        .eq('user_id', user.id);

    if (error) throw new Error(error.message);

    revalidatePath(`/tournaments/${gameId}/team/${teamId}`);
    revalidatePath(`/games/${gameId}`);
    return { success: true };
}

/**
 * [SOFT DELETE] Disband a team. 
 * Marks the team as cancelled and releases all players back to the FA pool.
 */
export async function disbandRollingTeam(teamId: string, gameId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Mark Team as cancelled (NO DELETE)
    const { error: teamError } = await supabase
        .from('teams')
        .update({ status: 'cancelled' })
        .eq('id', teamId)
        .eq('captain_id', user.id); // Security: Only captain can disband

    if (teamError) throw new Error(teamError.message);

    // 2. Release all players back to the FA Pool
    const { error: rosterError } = await supabase
        .from('tournament_registrations')
        .update({ 
            team_id: null,
            status: 'registered' 
        })
        .eq('team_id', teamId);

    if (rosterError) throw new Error(rosterError.message);

    // STRIPE HOOK: If captain paid a team deposit, initiate refund logic here.

    revalidatePath(`/games/${gameId}`);
    return { success: true };
}
