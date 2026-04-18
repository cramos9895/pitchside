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

    // 3. Validation: Check registration cutoff
    const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select('registration_cutoff, status, free_agent_price, player_registration_fee')
        .eq('id', leagueId)
        .single();

    if (leagueError || !league) throw new Error("League not found");
    if (league.status === 'cancelled' || league.status === 'completed') {
        throw new Error("League is not accepting registrations");
    }
    
    if (league.registration_cutoff) {
        const cutoffDate = new Date(league.registration_cutoff);
        if (new Date() > cutoffDate) {
            throw new Error("Registration deadline has passed for this league.");
        }
    }

    // 4. Create new team
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
            league_id: leagueId,
            name: teamName,
            captain_id: user.id,
            primary_color: primaryColor,
            accepting_free_agents: false,
            status: 'approved'
        })
        .select()
        .single();

    if (teamError || !team) throw new Error("Failed to create team: " + teamError?.message);

    // 5. Register/Recycle user to tournament_registrations
    const { error: regError } = await supabase
        .from('tournament_registrations')
        .upsert({
            league_id: leagueId,
            user_id: user.id,
            team_id: team.id,
            preferred_positions: positions,
            status: 'registered',
            role: 'captain'
        }, { onConflict: 'user_id,game_id,league_id' });

    if (regError) {
        // Rollback team creation if registration fails
        await supabase.from('teams').delete().eq('id', team.id);
        throw new Error("Failed to create registration: " + regError.message);
    }

    revalidatePath(`/leagues/${leagueId}`);
    return { success: true, teamId: team.id };
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

    // 3. Validation: Check registration cutoff
    const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select('registration_cutoff, status, free_agent_price, player_registration_fee')
        .eq('id', leagueId)
        .single();

    if (leagueError || !league) throw new Error("League not found");
    if (league.status === 'cancelled' || league.status === 'completed') {
        throw new Error("League is not accepting registrations");
    }

    if (league.registration_cutoff) {
        const cutoffDate = new Date(league.registration_cutoff);
        if (new Date() > cutoffDate) {
            throw new Error("Registration deadline has passed for this league.");
        }
    }

    // 4. Determine price and check for Credit Bypass
    const { data: profile } = await supabase.from('profiles').select('credit_balance').eq('id', user.id).single();
    
    const price = (league.free_agent_price ?? league.player_registration_fee ?? 0);
    
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
        initialStatus = 'pending';
    }

    // 5. Register/Recycle user to tournament_registrations (Global Draft Pool)
    const { error: regError } = await supabase
        .from('tournament_registrations')
        .upsert({
            league_id: leagueId,
            user_id: user.id,
            team_id: null, // explicitly null for free agents
            preferred_positions: positions,
            status: initialStatus
        }, { onConflict: 'user_id,game_id,league_id' });

    if (regError) {
        console.error('Registration error:', regError);
        return { success: false, error: regError.message };
    }

    revalidatePath(`/leagues/${leagueId}`);
    return { success: true };
}
