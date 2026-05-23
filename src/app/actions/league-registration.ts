'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function registerCaptain(formData: FormData) {
    const supabase = await createClient();
    
    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // 2. Extract form data
    const leagueId = formData.get('leagueId') as string;
    const teamName = formData.get('teamName') as string;
    const primaryColor = formData.get('primaryColor') as string;
    const positionsRaw = formData.get('positions') as string;
    let positions: string[] = [];
    
    try {
        positions = positionsRaw ? JSON.parse(positionsRaw) : [];
    } catch (e) {
        console.error("Failed to parse positions:", e);
    }
    
    if (!leagueId || !teamName) throw new Error("Missing required fields");

    // 3. Validation: Robust League Lookup (Checks both legacy 'leagues' and unified 'games')
    let leagueData: any = null;

    const { data: legacyLeague } = await supabase
        .from('leagues')
        .select('registration_cutoff, status, price_per_free_agent, player_registration_fee')
        .eq('id', leagueId)
        .maybeSingle();

    if (legacyLeague) {
        leagueData = {
            isLegacy: true, registration_cutoff: legacyLeague.registration_cutoff,
            status: legacyLeague.status,
            free_agent_price: Number(legacyLeague.price_per_free_agent || 0),
            player_registration_fee: Number(legacyLeague.player_registration_fee || 0)
        };
    } else {
        const { data: gameLeague } = await supabase
            .from('games')
            .select('registration_cutoff, status, free_agent_price, player_registration_fee')
            .eq('id', leagueId)
            .eq('event_type', 'league')
            .maybeSingle();
        
        if (gameLeague) {
            leagueData = {
                isLegacy: false, registration_cutoff: gameLeague.registration_cutoff,
                status: gameLeague.status,
                free_agent_price: Number(gameLeague.free_agent_price || 0),
                player_registration_fee: Number(gameLeague.player_registration_fee || 0)
            };
        }
    }

    if (!leagueData) throw new Error("League not found");
    if (leagueData.status === 'cancelled' || leagueData.status === 'completed') {
        throw new Error("League is not accepting registrations");
    }
    
    if (leagueData.registration_cutoff) {
        const cutoffDate = new Date(leagueData.registration_cutoff);
        if (new Date() > cutoffDate) {
            throw new Error("Registration deadline has passed for this league.");
        }
    }

    // 4. Dual-Role / Duplicate Registration Check (Checks both league_id and game_id)
    const { data: existingReg } = await supabase
        .from('tournament_registrations')
        .select('id, status, team_id')
        .eq('user_id', user.id)
        .or(`league_id.eq.${leagueId},game_id.eq.${leagueId}`)
        .maybeSingle();

    if (existingReg && 
        existingReg.status !== 'cancelled' && 
        existingReg.status !== 'withdrawn' &&
        existingReg.status !== 'pending'
    ) {
        throw new Error("You are already registered for this league.");
    }

    // 5. Create or Update team
    let teamId = existingReg?.team_id;
    const teamPayload: any = {
        name: teamName,
        captain_id: user.id,
        primary_color: primaryColor,
        accepting_free_agents: false,
        status: 'approved'
    };

    if (leagueData.isLegacy) {
        teamPayload.league_id = leagueId;
        teamPayload.game_id = null;
    } else {
        teamPayload.game_id = leagueId;
        teamPayload.league_id = null;
    }

    if (teamId) {
        await supabase.from('teams').update(teamPayload).eq('id', teamId);
    } else {
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .insert(teamPayload)
            .select()
            .single();
        if (teamError || !team) throw new Error("Failed to create team: " + teamError?.message);
        teamId = team.id;
    }

    // 6. Register/Recycle user to tournament_registrations
    const requestedStatus = (formData.get('status') as string) || 'registered';
    const regPayload: any = {
        user_id: user.id,
        team_id: teamId,
        preferred_positions: positions,
        status: requestedStatus,
        role: 'captain'
    };

    if (leagueData.isLegacy) {
        regPayload.league_id = leagueId; regPayload.game_id = null;
    } else {
        regPayload.game_id = leagueId; regPayload.league_id = null;
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
        // Rollback team creation if it was new
        if (!existingReg?.team_id) await supabase.from('teams').delete().eq('id', teamId);
        throw new Error("Failed to finalize registration.");
    }

    revalidatePath(`/leagues/${leagueId}`);
    return { success: true, teamId, registrationId, eventType: 'league' };
}

export async function registerFreeAgent(formData: FormData) {
    const supabase = await createClient();
    
    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // 2. Extract form data
    const leagueId = formData.get('leagueId') as string;
    const positionsRaw = formData.get('positions') as string;
    let positions: string[] = [];
    
    try {
        positions = positionsRaw ? JSON.parse(positionsRaw) : [];
    } catch (e) {
        console.error("Failed to parse positions:", e);
    }
    
    if (!leagueId || positions.length === 0) {
        throw new Error("Missing required fields. Please select at least one position.");
    }

    // 3. Validation: Robust League Lookup (Checks both legacy 'leagues' and unified 'games')
    let leagueData: any = null;

    const { data: legacyLeague } = await supabase
        .from('leagues')
        .select('registration_cutoff, status, price_per_free_agent, player_registration_fee')
        .eq('id', leagueId)
        .maybeSingle();

    if (legacyLeague) {
        leagueData = {
            isLegacy: true, registration_cutoff: legacyLeague.registration_cutoff,
            status: legacyLeague.status,
            free_agent_price: Number(legacyLeague.price_per_free_agent || 0),
            player_registration_fee: Number(legacyLeague.player_registration_fee || 0)
        };
    } else {
        const { data: gameLeague } = await supabase
            .from('games')
            .select('registration_cutoff, status, free_agent_price, player_registration_fee')
            .eq('id', leagueId)
            .eq('event_type', 'league')
            .maybeSingle();
        
        if (gameLeague) {
            leagueData = {
                isLegacy: false, registration_cutoff: gameLeague.registration_cutoff,
                status: gameLeague.status,
                free_agent_price: Number(gameLeague.free_agent_price || 0),
                player_registration_fee: Number(gameLeague.player_registration_fee || 0)
            };
        }
    }

    if (!leagueData) throw new Error("League not found");
    if (leagueData.status === 'cancelled' || leagueData.status === 'completed') {
        throw new Error("League is not accepting registrations");
    }

    if (leagueData.registration_cutoff) {
        const cutoffDate = new Date(leagueData.registration_cutoff);
        if (new Date() > cutoffDate) {
            throw new Error("Registration deadline has passed for this league.");
        }
    }

    // 4. Dual-Role / Duplicate Registration Check (Checks both league_id and game_id)
    const { data: existingReg } = await supabase
        .from('tournament_registrations')
        .select('id, status')
        .eq('user_id', user.id)
        .or(`league_id.eq.${leagueId},game_id.eq.${leagueId}`)
        .maybeSingle();

    if (existingReg && 
        existingReg.status !== 'cancelled' && 
        existingReg.status !== 'withdrawn' &&
        existingReg.status !== 'pending'
    ) {
        throw new Error("You are already registered for this league.");
    }

    // 5. Determine price and check for Credit Bypass
    const { data: profile } = await supabase.from('profiles').select('credit_balance').eq('id', user.id).single();
    
    let initialStatus = (formData.get('status') as string) || 'registered';

    if (!formData.get('status')) {
        const price = (leagueData.free_agent_price ?? leagueData.player_registration_fee ?? 0);
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

    // 6. Register/Recycle user to tournament_registrations
    const regPayload: any = {
        user_id: user.id,
        team_id: null,
        preferred_positions: positions,
        status: initialStatus,
        role: 'player'
    };

    if (leagueData.isLegacy) {
        regPayload.league_id = leagueId; regPayload.game_id = null;
    } else {
        regPayload.game_id = leagueId; regPayload.league_id = null;
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
        throw new Error("Failed to finalize registration.");
    }

    revalidatePath(`/leagues/${leagueId}`);
    return { success: true, registrationId, eventType: 'league' };
}
