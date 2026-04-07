'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function manualAddPlayerAction(gameId: string, userId: string, paymentMethod: string, basePrice: number = 0) {
    try {
        const supabase = await createClient();
        
        // 1. Verify user is Master Admin or Admin
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Unauthorized");
        
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin' && profile?.role !== 'master_admin') {
            throw new Error("Insufficient Permissions");
        }

        const adminSupabase = createAdminClient();

        // 2. Check if booking already exists
        const { data: existingBooking } = await adminSupabase
            .from('bookings')
            .select('id')
            .eq('game_id', gameId)
            .eq('user_id', userId)
            .single();

        if (existingBooking) {
            // Update to active/paid
            const { error: updateError } = await adminSupabase
                .from('bookings')
                .update({
                    status: 'paid', // Mark as paid for standard games
                    payment_status: 'verified',
                    payment_method: paymentMethod,
                    payment_amount: basePrice,
                })
                .eq('id', existingBooking.id);
            
            if (updateError) throw updateError;
        } else {
            // Insert new booking
            const { error: insertError } = await adminSupabase
                .from('bookings')
                .insert([{
                    game_id: gameId,
                    user_id: userId,
                    status: 'paid',
                    payment_status: 'verified',
                    payment_method: paymentMethod,
                    payment_amount: basePrice
                }]);
            
            if (insertError) throw insertError;
        }

        return { success: true, message: 'Player successfully added to the roster.' };

    } catch (error: any) {
        console.error("Manual Add Player Error:", error);
        return { success: false, error: error.message || "Failed to add player." };
    }
}
