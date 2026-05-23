'use server';

import { createClient } from '@/lib/supabase/server';

export async function searchProfiles(query: string) {
    if (!query || query.length < 2) return { success: true, profiles: [] };
    
    const supabase = await createClient();
    
    // Convert to lowercase and add wildcards for ILIKE semantics
    const searchString = `%${query.toLowerCase()}%`;

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .or(`first_name.ilike.${searchString},last_name.ilike.${searchString},email.ilike.${searchString}`)
        .limit(10);

    if (error) {
        console.error("Profile search error:", error);
        return { success: false, error: 'Failed to search profiles' };
    }

    return { success: true, profiles: profiles || [] };
}
