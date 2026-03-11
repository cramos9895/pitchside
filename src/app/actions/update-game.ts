'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function updateGame(gameId: string, formData: any) {
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Unauthorized');
    }

    // 2. Admin Check (Optional but recommended, relying on RLS mainly but good to have explicit check if needed)
    // Assuming RLS handles "Authenticated users can update games" as per schema.sql

    // 3. Update
    const { error } = await supabase
        .from('games')
        .update({
            title: formData.title,
            location: formData.location,
            latitude: formData.latitude,
            longitude: formData.longitude,
            start_time: formData.start_time,
            end_time: formData.end_time,
            price: (formData.event_type === 'tournament' || formData.event_type === 'league') ? null : formData.price,
            max_players: (formData.event_type === 'tournament' || formData.event_type === 'league') ? null : formData.max_players,
            surface_type: formData.surface_type,
            description: formData.description,
            reward: formData.prize_type === 'physical' ? formData.reward : null,
            prize_type: formData.prize_type,
            fixed_prize_amount: formData.prize_type === 'fixed' ? formData.fixed_prize_amount : null,
            prize_pool_percentage: formData.prize_type === 'pool' ? formData.prize_pool_percentage : null,
            refund_cutoff_date: formData.refund_cutoff_date,
            roster_lock_date: formData.roster_lock_date,
            strict_waiver_required: formData.strict_waiver_required,
            mercy_rule_cap: formData.mercy_rule_cap,
            teams_config: (formData.event_type === 'tournament' || formData.event_type === 'league') ? null : formData.teams_config,
            has_mvp_reward: formData.has_mvp_reward,
            is_refundable: formData.is_refundable,
            event_type: formData.event_type,
            allowed_payment_methods: formData.allowed_payment_methods,
            is_league: formData.is_league,
            total_weeks: formData.total_weeks,
            is_playoff_included: formData.is_playoff_included,
            team_roster_fee: formData.team_roster_fee,
            deposit_amount: formData.deposit_amount,
            min_players_per_team: formData.min_players_per_team,
            min_teams: formData.min_teams,
            max_teams: formData.max_teams,
            team_price: formData.team_price,
            free_agent_price: formData.free_agent_price,
            amount_of_fields: formData.amount_of_fields
        })
        .eq('id', gameId);

    if (error) {
        console.error('Error updating game:', error);
        throw new Error('Failed to update game');
    }

    // 4. Revalidate
    revalidatePath('/admin');
    revalidatePath(`/admin/games/${gameId}`);
    revalidatePath(`/games/${gameId}`);
    revalidatePath('/dashboard');
    revalidatePath('/schedule');
    revalidatePath('/');

    return { success: true };
}

export async function hardDeleteGame(gameId: string) {
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Unauthorized');
    }

    // 2. Admin verification
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'master_admin' && profile.role !== 'host')) {
        throw new Error('Forbidden. Must be an admin/host.');
    }

    // 3. Delete Game (Bypass RLS to ensure complete wipe)
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
        .from('games')
        .delete()
        .eq('id', gameId);

    if (error) {
        console.error('Error hard deleting game:', error);
        throw new Error('Failed to permanently delete the game.');
    }

    // 4. Revalidate
    revalidatePath('/admin');
    revalidatePath('/dashboard');
    revalidatePath('/schedule');
    revalidatePath('/');

    return { success: true };
}
