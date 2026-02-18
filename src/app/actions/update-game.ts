'use server';

import { createClient } from '@/lib/supabase/server';
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
            price: formData.price,
            max_players: formData.max_players,
            surface_type: formData.surface_type,
            teams_config: formData.teams_config,
            has_mvp_reward: formData.has_mvp_reward,
            allowed_payment_methods: formData.allowed_payment_methods
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

    return { success: true };
}
