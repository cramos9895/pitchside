'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function inviteFacilityStaff(email: string) {
    if (!email) throw new Error("Email is required.");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Get Active User Profile
    const { data: callerProfile } = await supabase
        .from('profiles')
        .select('role, system_role, facility_id')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = callerProfile?.system_role === 'super_admin' || callerProfile?.role === 'master_admin';
    const isFacilityAdmin = callerProfile?.system_role === 'facility_admin';

    if (!isSuperAdmin && !isFacilityAdmin) {
        throw new Error("Unauthorized.");
    }

    // Determine target facility
    let activeFacilityId = callerProfile?.facility_id;

    if (isSuperAdmin) {
        const cookieStore = await cookies();
        const impersonateCookie = cookieStore.get('pitchside_impersonate_facility_id');
        if (impersonateCookie?.value) {
            activeFacilityId = impersonateCookie.value;
        }
    }

    if (!activeFacilityId) {
        throw new Error("Cannot invite staff: No active facility context.");
    }

    const adminClient = createAdminClient();

    // 1. Send the invite via Supabase Admin Auth
    // The admin client uses the service_role key to bypass restrictions
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
        console.error("Invite User Error:", inviteError);

        // Handle case where user already exists (might be a player already)
        if (inviteError.status === 422 || inviteError.message.includes('already exists')) {
            // Attempt to find the existing user by email to link them

            // This is tricky because there's no direct "getUserByEmail" in standard supabaseClient for safety.
            // But we can query the public.profiles table since email is synced there in the PitchSide schema.
            const { data: existingProfile } = await adminClient
                .from('profiles')
                .select('id, facility_id')
                .eq('email', email)
                .single();

            if (!existingProfile) {
                throw new Error("User exists in auth but has no profile. Cannot link.");
            }

            if (existingProfile.facility_id && existingProfile.facility_id !== activeFacilityId) {
                throw new Error("User is already linked to a different facility.");
            }

            // Link the existing user
            const { error: linkError } = await adminClient
                .from('profiles')
                .update({
                    facility_id: activeFacilityId,
                    system_role: 'facility_admin',
                    verification_status: 'verified'
                })
                .eq('id', existingProfile.id);

            if (linkError) throw new Error("Failed to link existing user: " + linkError.message);

            revalidatePath('/facility/settings/team');
            return { success: true, message: "Existing user successfully linked to facility." };

        } else {
            throw new Error(inviteError.message);
        }
    }

    // 2. We successfully invited a brand new user. 
    // They will exist in auth.users now. The trigger should create their public.profile.
    // We need to immediately secure their profile row to THIS facility.

    // Slight delay to allow the Postgres trigger to create the profile row
    await new Promise(resolve => setTimeout(resolve, 500));

    const invitedUserId = inviteData.user.id;

    const { error: updateError } = await adminClient
        .from('profiles')
        .update({
            facility_id: activeFacilityId,
            system_role: 'facility_admin',
            verification_status: 'verified' // Bypass master approval
        })
        .eq('id', invitedUserId);

    if (updateError) {
        console.error("Failed to update newly invited profile:", updateError);
        throw new Error("Invite sent, but failed to link profile correctly.");
    }

    revalidatePath('/facility/settings/team');
    return { success: true, message: "Invitation sent successfully." };
}
