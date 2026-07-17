'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function registerTournamentTeam(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("You must be logged in to register a team.");
    }

    const tournamentId = formData.get('tournament_id') as string;
    const teamName = formData.get('team_name') as string;
    const primaryColor = formData.get('primary_color') as string;
    // Removed split payment validation since it is now a universal liability check
    const liabilityAcknowledged = formData.get('liability_acknowledged') === 'on';

    if (!teamName) {
        throw new Error("Team Name is required.");
    }

    // 1. Determine if this tournament corresponds to a game or a league
    const { data: gameCheck } = await supabase.from('games').select('id, event_type, payment_collection_type').eq('id', tournamentId).maybeSingle();
    const isGame = !!gameCheck;
    
    let paymentCollectionType = gameCheck?.payment_collection_type;

    if (!isGame) {
        const { data: leagueCheck } = await supabase.from('leagues').select('id, payment_collection_type').eq('id', tournamentId).single();
        paymentCollectionType = leagueCheck?.payment_collection_type;
    }

    if (paymentCollectionType !== 'player_fees' && !liabilityAcknowledged) {
        throw new Error("You must acknowledge financial liability.");
    }

    // 3. Dual-Role / Duplicate Registration Check (Recycling Pattern)
    const { data: existingReg } = await supabase
        .from('tournament_registrations')
        .select('id, status, team_id')
        .eq('user_id', user.id)
        .or(`game_id.eq.${tournamentId},league_id.eq.${tournamentId}`)
        .maybeSingle();

    if (existingReg && 
        existingReg.status !== 'cancelled' && 
        existingReg.status !== 'withdrawn' && 
        existingReg.status !== 'pending'
    ) {
        throw new Error("You are already registered for this tournament/league.");
    }

    // Determine if Game or League (already checked above)
    const eventType = gameCheck?.event_type || 'league';

    const teamPayload: any = {
        captain_id: user.id,
        name: teamName,
        primary_color: primaryColor,
        accepting_free_agents: false // Default to false
    };
    if (isGame) {
        teamPayload.game_id = tournamentId;
    } else {
        teamPayload.league_id = tournamentId;
    }

    let teamId = existingReg?.team_id;
    let teamError;

    if (teamId) {
        // Update existing team if it was pending
        const { error } = await supabase
            .from('teams')
            .update(teamPayload)
            .eq('id', teamId);
        teamError = error;
    } else {
        // Create the Team in the teams table
        const { data: team, error: err } = await supabase
            .from('teams')
            .insert([teamPayload])
            .select()
            .single();
        teamId = team?.id;
        teamError = err;
    }

    if (teamError || !teamId) {
        console.error("Error creating/updating team:", teamError);
        throw new Error("Failed to process team details.");
    }

    // 3. Register/Recycle the Captain in tournament_registrations
    const requestedStatus = (formData.get('status') as string) || 'registered';

    const regPayload: any = {
        user_id: user.id,
        team_id: teamId,
        status: requestedStatus,
        role: 'captain'
    };
    if (isGame) {
        regPayload.game_id = tournamentId;
    } else {
        regPayload.league_id = tournamentId;
    }

    let regError;
    let registrationId = existingReg?.id;

    if (registrationId) {
        const { error } = await supabase
            .from('tournament_registrations')
            .update(regPayload)
            .eq('id', registrationId);
        regError = error;
    } else {
        const { data: newReg, error: err } = await supabase
            .from('tournament_registrations')
            .insert([regPayload])
            .select()
            .single();
        regError = err;
        registrationId = newReg?.id;
    }

    if (regError || !registrationId) {
        console.error("Error registering captain:", regError);
        throw new Error("Failed to finalize registration.");
    }

    revalidatePath(`/schedule`);
    return { success: true, teamId, registrationId, eventType };
}

export async function registerTournamentFreeAgent(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("You must be logged in to register as a free agent.");
    }

    const tournamentId = formData.get('tournament_id') as string;
    const positions = formData.getAll('positions') as string[];

    if (positions.length === 0) {
        throw new Error("You must select at least one preferred position.");
    }

    // 1. Dual-Role / Duplicate Registration Check (Recycling Pattern)
    const { data: existingReg } = await supabase
        .from('tournament_registrations')
        .select('id, status')
        .eq('user_id', user.id)
        .or(`game_id.eq.${tournamentId},league_id.eq.${tournamentId}`)
        .maybeSingle();

    if (existingReg && 
        existingReg.status !== 'cancelled' && 
        existingReg.status !== 'withdrawn' &&
        existingReg.status !== 'pending'
    ) {
        throw new Error("You are already registered for this tournament/league.");
    }

    // 1. Determine if this tournament corresponds to a game or a league
    const { data: gameCheck } = await supabase.from('games').select('id, event_type').eq('id', tournamentId).single();
    const isGame = !!gameCheck;
    const eventType = gameCheck?.event_type || 'league';

    // 2. Determine price and check for Credit Bypass
    const { data: profile } = await supabase.from('profiles').select('credit_balance').eq('id', user.id).single();
    
    let initialStatus = (formData.get('status') as string) || 'registered';

    // If no status provided, check for credit bypass
    if (!formData.get('status')) {
        const { data: gameData } = await supabase.from('games').select('free_agent_price, player_registration_fee').eq('id', tournamentId).single();
        const { data: leagueData } = await supabase.from('leagues').select('free_agent_price, player_registration_fee').eq('id', tournamentId).single();
        
        const price = (gameData?.free_agent_price ?? gameData?.player_registration_fee ?? 
                       leagueData?.free_agent_price ?? leagueData?.player_registration_fee ?? 0);
        
        const walletBalance = profile?.credit_balance || 0;

        if (price > 0 && walletBalance >= (price * 100)) {
            const { error: walletError } = await supabase
                .from('profiles')
                .update({ credit_balance: walletBalance - (price * 100) })
                .eq('id', user.id);
            if (walletError) throw new Error("Credit deduction failed.");
            initialStatus = 'registered';
        } else if (price > 0) {
            initialStatus = 'pending';
        }
    }

    const regPayload: any = {
        user_id: user.id,
        team_id: null,
        preferred_positions: positions,
        status: initialStatus,
        role: 'player'
    };
    if (isGame) {
        regPayload.game_id = tournamentId;
    } else {
        regPayload.league_id = tournamentId;
    }

    let regError;
    let registrationId = existingReg?.id;

    if (registrationId) {
        const { error } = await supabase
            .from('tournament_registrations')
            .update(regPayload)
            .eq('id', registrationId);
        regError = error;
    } else {
        const { data: newReg, error: err } = await supabase
            .from('tournament_registrations')
            .insert([regPayload])
            .select()
            .single();
        regError = err;
        registrationId = newReg?.id;
    }

    if (regError || !registrationId) {
        console.error("Error registering free agent:", regError);
        throw new Error(`Failed to join draft pool: ${regError?.message || 'Unknown error'}`);
    }

    revalidatePath(`/schedule`);
    return { success: true, registrationId, eventType };
}

export async function leaveTournament(registrationId: string, tournamentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("You must be logged in to leave a tournament.");
    }

    // Security check: Ensure the registration belongs to the user
    const { data: reg, error: fetchError } = await supabase
        .from('tournament_registrations')
        .select('user_id, role')
        .eq('id', registrationId)
        .single();

    if (fetchError || !reg) {
        throw new Error("Registration not found.");
    }

    if (reg.user_id !== user.id) {
        throw new Error("Unauthorized: You can only remove your own registration.");
    }

    // If they are the captain, they should probably delete the whole team or transfer leadership.
    // For now, let's keep it simple: if they leave, they are just removed.
    // However, if they are the ONLY person, the team becomes empty.
    
    const { error: deleteError } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('id', registrationId);

    if (deleteError) {
        console.error("Error leaving tournament:", deleteError);
        throw new Error("Failed to leave tournament.");
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    revalidatePath(`/dashboard`);
    revalidatePath(`/admin/games/${tournamentId}`);

    return { success: true };
}

/**
 * Called when a user closes the Stripe payment modal without completing payment.
 * Deletes the 'pending' registration AND the orphaned team that was pre-created.
 * This prevents ghost teams from appearing in the admin roster.
 * Security: Only allows the authenticated user to cancel their own pending registration.
 */
export async function cancelPendingRegistration(registrationId: string, teamId: string | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false }; // Silently fail if not authed (shouldn't happen)

    // Security: verify this pending registration belongs to the calling user
    const { data: reg } = await supabase
        .from('tournament_registrations')
        .select('user_id, status')
        .eq('id', registrationId)
        .maybeSingle();

    // Only allow deletion if it's genuinely 'pending' and owned by this user
    if (!reg || reg.user_id !== user.id || reg.status !== 'pending') {
        return { success: false };
    }

    // Delete the pending registration first (foreign key cascade will handle related rows)
    const { error: regError } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('id', registrationId);

    if (regError) {
        console.error('Failed to delete pending registration:', regError);
        return { success: false };
    }

    // Delete the orphaned team if one was created for this registration
    // Only delete if this captain created it and no other registrations reference it
    if (teamId) {
        const { count } = await supabase
            .from('tournament_registrations')
            .select('id', { count: 'exact', head: true })
            .eq('team_id', teamId);

        if (count === 0) {
            await supabase.from('teams').delete().eq('id', teamId).eq('captain_id', user.id);
        }
    }

    return { success: true };
}
