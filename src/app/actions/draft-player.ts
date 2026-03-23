'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function toggleAcceptingFreeAgents(teamId: string, isAccepting: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    const { error } = await supabase
        .from('teams')
        .update({ accepting_free_agents: isAccepting })
        .eq('id', teamId);

    if (error) {
        console.error('Error toggling free agents:', error);
        throw new Error('Failed to update team settings.');
    }

    revalidatePath(`/tournaments/[id]/team/[team_id]`, 'page');
}

export async function draftFreeAgent(registrationId: string, teamId: string) {
    // 1. Get the user's session (standard client)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    console.log('Drafting Request (Admin Bypass):', { registrationId, teamId, requestedBy: user.id });

    // 2. MANUAL SECURITY CHECK: Verify the requester is the Captain of the target team
    // We check tournament_registrations to see if they have a 'captain' role for this team_id
    const { data: captainStatus, error: captainError } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .eq('role', 'captain')
        .single();

    if (captainError || !captainStatus) {
        console.error('Security Violation: User is not the Captain of team', teamId);
        throw new Error('Unauthorized: Only the team captain can draft players.');
    }

    // 3. Initialize Admin Client to bypass RLS for the update
    const adminSupabase = await createAdminClient();

    // 4. Data Integrity: Ensure the player is still unassigned
    const { data: reg, error: fetchError } = await adminSupabase
        .from('tournament_registrations')
        .select('team_id, league_id')
        .eq('id', registrationId)
        .single();

    if (fetchError || !reg) {
        throw new Error('Player registration not found.');
    }

    if (reg.team_id !== null) {
        throw new Error('Player is already drafted to another team.');
    }

    // 5. Atomic Update via Admin Client
    const { data: updatedData, error: updateError } = await adminSupabase
        .from('tournament_registrations')
        .update({ 
            team_id: teamId,
            status: 'drafted' 
        })
        .eq('id', registrationId)
        .select();

    if (updateError) {
        console.error('Error drafting player (Admin):', updateError.message);
        throw new Error(`Drafting failed: ${updateError.message}`);
    }

    if (!updatedData || updatedData.length === 0) {
        console.error('Update failed: Service role update returned no rows.');
        throw new Error('Drafting failed: Database update returned empty.');
    }

    console.log('Drafting SUCCESS (Admin Bypass):', updatedData[0]);

    // 6. Revalidate all relevant paths
    revalidatePath(`/tournaments/[id]/team/[team_id]`, 'page');
    revalidatePath(`/admin/(dashboard)/games/[id]`, 'page');
    revalidatePath(`/admin`, 'layout');
}
