'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function createResource(formData: FormData) {
    console.log('[createResource] INCOMING FORMDATA:', Array.from(formData.entries()));
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Unauthorized' };
    }

    // 1. Fetch User Profile to securely grab their facility_id and verify role
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('system_role, role, facility_id')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        return { error: 'Profile not found' };
    }

    const isSuperAdmin = profile.system_role === 'super_admin' || profile.role === 'master_admin';

    if (profile.system_role !== 'facility_admin' && !isSuperAdmin) {
        return { error: 'Forbidden. Facility Admin rights required.' };
    }

    if (!isSuperAdmin && !profile.facility_id) {
        return { error: 'No facility assigned to this admin account.' };
    }

    const name = formData.get('name') as string;
    const type = formData.get('type') as string;

    if (!name || !type) {
        return { error: 'Missing required fields' };
    }

    // Determine the facility_id to use
    let targetFacilityId = profile.facility_id;

    if (isSuperAdmin) {
        const selectedFacilityId = formData.get('facility_id') as string;
        if (!selectedFacilityId) {
            return { error: 'Super Admin: Please explicitly select a facility to assign this resource to.' };
        }
        targetFacilityId = selectedFacilityId;
    }

    if (!targetFacilityId) {
        return { error: 'No facility selected or assigned.' };
    }

    // 2. Insert into Database
    const adminSupabase = createAdminClient();
    const { error: insertError } = await adminSupabase
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
