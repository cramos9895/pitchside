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
