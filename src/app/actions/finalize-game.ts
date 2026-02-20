'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface FinalizeGameResult {
    success: boolean;
    error?: string;
}

export async function finalizeGame(
    gameId: string,
    winningTeamName: string | null,
    mvpPlayerId: string | null
): Promise<FinalizeGameResult> {
    const supabase = await createClient();

    try {
        // 1. Auth Check - Ideally check for admin role here if RLS isn't stricter
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        // 2. Fetch Game
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('id, teams_config, has_mvp_reward')
            .eq('id', gameId)
            .single();

        if (gameError || !game) {
            return { success: false, error: 'Game not found' };
        }

        // 3. Update Game Status & MVP
        const { error: updateError } = await supabase
            .from('games')
            .update({
                status: 'completed',
                mvp_player_id: mvpPlayerId || null
            })
            .eq('id', gameId);

        if (updateError) {
            console.error('Update Game Error:', updateError);
            return { success: false, error: 'Failed to update game status' };
        }

        // 4. Update Winners (Reset all first)
        const { error: resetError } = await supabase
            .from('bookings')
            .update({ is_winner: false })
            .eq('game_id', gameId);

        if (resetError) {
            console.error('Reset Winner Error:', resetError);
            // Continue? Probably safer to fail.
            return { success: false, error: 'Failed to reset winners' };
        }

        // Set Winner
        if (winningTeamName) {
            const { error: winnerError } = await supabase
                .from('bookings')
                .update({ is_winner: true })
                .eq('game_id', gameId)
                .eq('team_assignment', winningTeamName);

            if (winnerError) {
                console.error('Set Winner Error:', winnerError);
                return { success: false, error: 'Failed to set winner' };
            }
        }

        // 5. Update MVP Profile Stats (Increment)
        if (mvpPlayerId) {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('mvp_awards, free_game_credits')
                .eq('id', mvpPlayerId)
                .single();

            if (profile && !profileError) {
                const updates: any = {
                    mvp_awards: (profile.mvp_awards || 0) + 1
                };

                if (game.has_mvp_reward) {
                    updates.free_game_credits = (profile.free_game_credits || 0) + 1;
                }

                await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', mvpPlayerId);
            }
        }

        // 6. Revalidate
        revalidatePath('/dashboard');
        revalidatePath('/leaderboard');
        revalidatePath('/profile');
        revalidatePath(`/admin/games/${gameId}`);
        revalidatePath('/admin');
        revalidatePath('/'); // For homepage schedule/stats if applicable

        return { success: true };

    } catch (error: any) {
        console.error('Finalize Game Unexpected Error:', error);
        return { success: false, error: error.message || 'Unexpected error' };
    }
}
