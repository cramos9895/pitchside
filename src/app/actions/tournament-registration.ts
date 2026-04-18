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

    if (!liabilityAcknowledged) {
        throw new Error("You must acknowledge financial liability.");
    }

    // 3. Dual-Role / Duplicate Registration Check (Recycling Pattern)
    const { data: existingReg } = await supabase
        .from('tournament_registrations')
        .select('id, status')
        .eq('user_id', user.id)
        .or(`game_id.eq.${tournamentId},league_id.eq.${tournamentId}`)
        .maybeSingle();

    if (existingReg && existingReg.status !== 'cancelled' && existingReg.status !== 'withdrawn') {
        throw new Error("You are already registered for this tournament/league.");
    }

    // 1. Determine if this tournament corresponds to a game or a league
    const { data: gameCheck } = await supabase.from('games').select('id').eq('id', tournamentId).single();
    const isGame = !!gameCheck;
    const insertPayload: any = {
        captain_id: user.id,
        name: teamName,
        primary_color: primaryColor,
        accepting_free_agents: false // Default to false
    };
    if (isGame) {
        insertPayload.game_id = tournamentId;
    } else {
        insertPayload.league_id = tournamentId;
    }

    // 2. Create the Team in the teams table
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert([insertPayload])
        .select()
        .single();

    if (teamError || !team) {
        console.error("Error creating team:", teamError);
        throw new Error("Failed to create team.");
    }

    // 3. Register/Recycle the Captain in tournament_registrations
    const regPayload: any = {
        user_id: user.id,
        team_id: team.id,
        status: 'registered',
        role: 'captain'
    };
    if (isGame) {
        regPayload.game_id = tournamentId;
    } else {
        regPayload.league_id = tournamentId;
    }

    const { error: regError } = await supabase
        .from('tournament_registrations')
        .upsert(regPayload, { onConflict: 'user_id,game_id,league_id' });

    if (regError) {
        console.error("Error registering captain:", regError);
        // We'd ideally rollback the team creation here, but we'll keep it simple for now
        throw new Error("Failed to finalize registration.");
    }

    // Here we'd integrate Stripe checkout. For this prototype, assume success.

    revalidatePath(`/schedule`);
    return { success: true, teamId: team.id };
}

export async function registerTournamentFreeAgent(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("You must be logged in to register as a free agent.");
    }

    const tournamentId = formData.get('tournament_id') as string;
    // Extract positions
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

    if (existingReg && existingReg.status !== 'cancelled' && existingReg.status !== 'withdrawn') {
        throw new Error("You are already registered for this tournament/league.");
    }

    // 1. Determine if this tournament corresponds to a game or a league
    const { data: gameCheck } = await supabase.from('games').select('id').eq('id', tournamentId).single();
    const isGame = !!gameCheck;

    // 2. Determine price and check for Credit Bypass
    const { data: profile } = await supabase.from('profiles').select('credit_balance').eq('id', user.id).single();
    const { data: gameData } = await supabase.from('games').select('free_agent_price, player_registration_fee').eq('id', tournamentId).single();
    const { data: leagueData } = await supabase.from('leagues').select('free_agent_price, player_registration_fee').eq('id', tournamentId).single();
    
    const price = (gameData?.free_agent_price ?? gameData?.player_registration_fee ?? 
                   leagueData?.free_agent_price ?? leagueData?.player_registration_fee ?? 0);
    
    let initialStatus = 'registered';
    const walletBalance = profile?.credit_balance || 0;

    if (price > 0 && walletBalance >= (price * 100)) {
        // Deduct from wallet
        const { error: walletError } = await supabase
            .from('profiles')
            .update({ credit_balance: walletBalance - (price * 100) })
            .eq('id', user.id);
        if (walletError) throw new Error("Credit deduction failed.");
        initialStatus = 'registered';
    } else if (price > 0) {
        // If price > 0 and not covered, we expect the frontend/webhook to handle the final 'registered' status
        // But for this action, we set it to pending if bypass didn't happen
        initialStatus = 'pending';
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

    // 3. Register/Recycle user in tournament_registrations (Draft Pool)
    const { error: regError } = await supabase
        .from('tournament_registrations')
        .upsert(regPayload, { onConflict: 'user_id,game_id,league_id' });

    if (regError) {
        console.error("Error registering free agent:", regError);
        // Supabase foreign key / unique constraints might trip if they already registered
        if (regError.code === '23505') {
            throw new Error("You have already registered for this tournament.");
        }
        // Return detailed error for diagnosis
        throw new Error(`Failed to join draft pool: ${regError.message} (${regError.code}) ${regError.details || ''}`);
    }

    revalidatePath(`/schedule`);
    return { success: true };
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
