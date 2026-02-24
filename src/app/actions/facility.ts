'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createResource(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Unauthorized' };
    }

    // 1. Fetch User Profile to securely grab their facility_id and verify role
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('system_role, facility_id')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        return { error: 'Profile not found' };
    }

    if (profile.system_role !== 'facility_admin' && profile.system_role !== 'super_admin') {
        return { error: 'Forbidden. Facility Admin rights required.' };
    }

    if (profile.system_role !== 'super_admin' && !profile.facility_id) {
        return { error: 'No facility assigned to this admin account.' };
    }

    const name = formData.get('name') as string;
    const type = formData.get('type') as string;

    if (!name || !type) {
        return { error: 'Missing required fields' };
    }

    // Determine the facility_id to use
    // For now, if a Super Admin is testing, we will reject if they don't have a facility_id attached to their profile for safety.
    // In the future, Super Admins might pass a facility ID in the form, but for this strict CRUD, we bind to the profile.
    const targetFacilityId = profile.facility_id;

    if (!targetFacilityId) {
        return { error: 'Super Admin: Please assign yourself to a facility first before creating resources.' };
    }

    // 2. Insert into Database
    const { error: insertError } = await supabase
        .from('resources')
        .insert({
            facility_id: targetFacilityId,
            name: name,
            type: type
        });

    if (insertError) {
        console.error('[FACILITY ACTION] Resource Creation Error:', insertError);
        return { error: 'Failed to create resource. Please try again.' };
    }

    // 3. Revalidate the view so the UI instantly updates
    revalidatePath('/facility/resources');

    return { success: true };
}
