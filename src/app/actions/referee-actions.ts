'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function rateReferee(officialId: string, rating: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    if (rating < 1 || rating > 5) {
        throw new Error("Invalid rating");
    }

    // 1. Update the match_official with the rating
    const { data: official, error: updateError } = await supabase
        .from('match_officials')
        .update({ captain_rating: rating })
        .eq('id', officialId)
        .select('user_id')
        .single();

    if (updateError || !official) {
        throw new Error("Failed to update rating");
    }

    // 2. Recalculate referee's average rating if they are on platform
    if (official.user_id) {
        // Fetch all ratings for this referee
        const { data: allOfficials, error: fetchError } = await supabase
            .from('match_officials')
            .select('captain_rating')
            .eq('user_id', official.user_id)
            .not('captain_rating', 'is', null);

        if (!fetchError && allOfficials && allOfficials.length > 0) {
            const sum = allOfficials.reduce((acc, curr) => acc + (curr.captain_rating || 0), 0);
            const average = sum / allOfficials.length;

            // Cap to 1 decimal place
            const roundedAverage = Math.round(average * 10) / 10;

            await supabase
                .from('profiles')
                .update({ reliability_rating: roundedAverage })
                .eq('id', official.user_id);
        }
    }

    revalidatePath('/leagues');
    
    return { success: true };
}
