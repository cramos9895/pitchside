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

    // 3. Update with new fields included
    const { error } = await supabase
        .from('games')
        .update({
            title: formData.title,
            rules_description: formData.rules_description,
            location: formData.location,
            location_nickname: formData.location_nickname,
            latitude: formData.latitude,
            longitude: formData.longitude,
            start_time: formData.start_time,
            end_time: formData.end_time,
            price: (formData.event_type === 'tournament' || formData.event_type === 'league') ? null : formData.price,
            max_players: (formData.event_type === 'tournament' || formData.event_type === 'league') ? null : formData.max_players,
            game_format_type: formData.game_format_type,
            match_style: formData.match_style,
            surface_type: formData.surface_type,
            amount_of_fields: formData.amount_of_fields,
            field_size: formData.field_size,
            shoe_types: formData.shoe_types,
            event_type: formData.event_type,
            is_league: (formData.event_type === 'tournament' || formData.event_type === 'league'),
            teams_config: (formData.event_type === 'tournament' || formData.event_type === 'league') ? null : formData.teams_config,
            is_refundable: formData.is_refundable,
            refund_cutoff_hours: formData.refund_cutoff_hours,
            allowed_payment_methods: formData.allowed_payment_methods,
            team_price: formData.team_price,
            deposit_amount: formData.deposit_amount,
            has_registration_fee_credit: formData.has_registration_fee_credit,
            free_agent_price: formData.free_agent_price,
            has_free_agent_credit: formData.has_free_agent_credit,
            refund_cutoff_date: formData.refund_cutoff_date,
            min_teams: formData.min_teams,
            max_teams: formData.max_teams,
            min_players_per_team: formData.min_players_per_team,
            max_players_per_team: formData.max_players_per_team,
            roster_lock_date: formData.roster_lock_date,
            strict_waiver_required: formData.strict_waiver_required,
            game_style: formData.game_style,
            half_length: formData.half_length,
            halftime_length: formData.halftime_length,
            earliest_game_start_time: formData.earliest_game_start_time,
            latest_game_start_time: formData.latest_game_start_time,
            field_names: formData.field_names,
            min_games_guaranteed: formData.min_games_guaranteed,
            teams_into_playoffs: formData.teams_into_playoffs,
            has_playoff_bye: formData.has_playoff_bye,
            break_between_games: formData.break_between_games,
            tournament_style: formData.tournament_style,
            minimum_games_per_team: formData.minimum_games_per_team,
            prize_type: formData.prize_type,
            prize_pool_percentage: formData.prize_pool_percentage,
            fixed_prize_amount: formData.fixed_prize_amount,
            reward: formData.reward,
            has_mvp_reward: formData.has_mvp_reward,
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'master_admin' && profile.role !== 'host')) {
        throw new Error('Forbidden. Must be an admin/host.');
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
        .from('games')
        .delete()
        .eq('id', gameId);

    if (error) {
        console.error('Error hard deleting game:', error);
        throw new Error('Failed to permanently delete the game.');
    }

    revalidatePath('/admin');
    revalidatePath('/dashboard');
    revalidatePath('/schedule');
    revalidatePath('/');

    return { success: true };
}
