'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Toggles the checked_in status of a player.
 * @param mode 'global' maps to bookings.checked_in, 'match' maps to match_players.is_checked_in
 */
export async function checkInPlayer(
    bookingId: string, 
    gameId: string, 
    matchId: string | null, 
    status: boolean,
    mode: 'global' | 'match' = 'global'
) {
    const supabase = await createClient();
    
    if (mode === 'global') {
        const { error: bookingError } = await supabase
            .from('bookings')
            .update({ checked_in: status })
            .eq('id', bookingId);
        
        // Also update tournament_registrations if this is a tournament registration ID
        const { error: regError } = await supabase
            .from('tournament_registrations')
            .update({ checked_in: status })
            .eq('id', bookingId);
            
        if (bookingError && regError) throw new Error(bookingError.message || regError.message);
    } else if (mode === 'match' && matchId) {
        // For match-specific check-ins, we need the user_id
        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select('user_id')
            .eq('id', bookingId)
            .single();
            
        if (fetchError || !booking) throw new Error("Could not find booking or user_id");

        const { error } = await supabase
            .from('match_players')
            .upsert({ 
                match_id: matchId, 
                user_id: booking.user_id, 
                is_checked_in: status 
            }, { onConflict: 'match_id, user_id' });
            
        if (error) throw new Error(error.message);
    } else {
        throw new Error("Invalid check-in mode or missing matchId for match-specific check-in");
    }

    // Revalidate relevant paths
    if (matchId) {
        revalidatePath(`/admin/matches/${matchId}/manage`);
    }
    revalidatePath(`/admin/games/${gameId}`);
    revalidatePath(`/admin/games/${gameId}/display`);

    return { success: true };
}

/**
 * Toggles the manual physical waiver override for a booking.
 */
export async function toggleManualWaiver(bookingId: string, gameId: string, status: boolean) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('bookings')
        .update({ has_physical_waiver: status })
        .eq('id', bookingId);
    
    if (error) throw new Error(error.message);

    revalidatePath(`/admin/games/${gameId}`);
    
    return { success: true };
}

/**
 * Uploads a player headshot to Supabase Storage and updates their profile.
 */
export async function updatePlayerPhoto(userId: string, gameId: string, formData: FormData) {
    console.log(`[updatePlayerPhoto] Starting upload for user: ${userId}, game: ${gameId}`);
    const supabase = await createClient();
    const file = formData.get('photo') as File;
    
    if (!file) {
        console.error("[updatePlayerPhoto] No photo found in FormData");
        throw new Error("No photo provided in the upload request.");
    }

    console.log(`[updatePlayerPhoto] File received: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

    // Validate file type
    if (!file.type.startsWith('image/')) {
        throw new Error("Invalid file type. Please upload an image.");
    }

    const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`; // Using root of player-headshots bucket or specified path

    // 1. Upload to Storage
    // We'll try the 'avatars' bucket as per previous setup, but providing a clear error if it fails
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
            upsert: true,
            contentType: file.type
        });

    if (uploadError) {
        console.error("[updatePlayerPhoto] Storage Upload Error:", uploadError);
        throw new Error(`Storage upload failed: ${uploadError.message}. Ensure the 'avatars' bucket exists and RLS allows uploads.`);
    }

    console.log("[updatePlayerPhoto] Storage upload successful:", uploadData.path);

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

    if (!publicUrl) {
        throw new Error("Failed to generate public URL for the uploaded photo.");
    }

    console.log("[updatePlayerPhoto] Generated Public URL:", publicUrl);

    // 3. Update Tournament Registration
    const { error: updateError } = await supabase
        .from('tournament_registrations')
        .update({ verification_photo_url: publicUrl })
        .eq('id', userId); // userId here is actually the registration ID in this context, but let's be more explicit in the args for clarity

    if (updateError) {
        console.error("[updatePlayerPhoto] Registration Update Error:", updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log("[updatePlayerPhoto] Registration updated successfully with verification photo");

    revalidatePath(`/admin/games/${gameId}`);
    
    return { success: true, publicUrl };
}
