'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function registerAccount(formData: FormData) {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const accountType = formData.get('accountType') as 'player' | 'facility';
    const organizationName = formData.get('organizationName') as string;

    if (!email || !password || !fullName) {
        return { error: 'Missing required fields.' };
    }

    // 1. Sign up the user via standard Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName }
        }
    });

    if (authError) {
        return { error: authError.message };
    }

    const userId = authData.user?.id;
    if (!userId) {
        return { error: 'Failed to create user account.' };
    }

    // 2. Post-Registration Logic based on Account Type
    if (accountType === 'facility') {
        if (!organizationName) {
            // Rollback if needed in a real app, but for now we just return error
            return { error: 'Organization Name is required for Facility Owners.' };
        }

        // Generate a URL-friendly slug
        const baseSlug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const uniqueSuffix = Math.random().toString(36).substring(2, 8);
        const facilitySlug = `${baseSlug}-${uniqueSuffix}`;

        // Insert Facility
        const { data: newFacility, error: facilityError } = await supabaseAdmin
            .from('facilities')
            .insert([{ name: organizationName, slug: facilitySlug }])
            .select()
            .single();

        if (facilityError) {
            console.error("Facility creation error:", facilityError);
            return { error: 'Failed to create organization profile.' };
        }

        // Elevate user to facility_admin, set them to pending, and link the facility
        const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({
                system_role: 'facility_admin',
                verification_status: 'pending',
                facility_id: newFacility.id
            })
            .eq('id', userId);

        if (profileUpdateError) {
            console.error("Profile update error:", profileUpdateError);
            return { error: 'Failed to assign facility permissions.' };
        }
    } else {
        // Explicitly ensure player type is active
        const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({
                role: 'player',
                verification_status: 'verified'
            })
            .eq('id', userId);

        if (profileUpdateError) {
            console.error("Profile update error:", profileUpdateError);
        }
    }

    return { success: true };
}
