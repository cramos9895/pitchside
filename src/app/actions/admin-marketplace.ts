'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { sendNotification } from '@/lib/notifications';

export async function claimMarketplaceSlot(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Unauthorized' };
    }

    // Role verification (Only Master or Super Admins can claim slots)
    const { data: profile } = await supabase
        .from('profiles')
        .select('system_role, role')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.system_role === 'super_admin' || profile?.role === 'master_admin';
    if (!isSuperAdmin) {
        return { error: 'Forbidden. Master Admin rights required to claim network slots.' };
    }

    const facility_id = formData.get('facility_id') as string;
    const resource_id = formData.get('resource_id') as string;
    const start_time = formData.get('start_time') as string;
    const end_time = formData.get('end_time') as string;
    // Phase 14: Force all network claims to be pending facility approval
    const status = 'pending_facility_review';

    if (!facility_id || !resource_id || !start_time || !end_time) {
        return { error: 'Missing required tracking fields for Claim.' };
    }

    const startTimeObj = new Date(start_time);
    const endTimeObj = new Date(end_time);

    if (endTimeObj <= startTimeObj) {
        return { error: 'End time must be after start time.' };
    }

    const adminSupabase = createAdminClient();

    // Collision Check: Ensure the slot hasn't been booked by the facility in the last few seconds
    const { data: conflicts, error: conflictError } = await adminSupabase
        .from('resource_bookings')
        .select('id')
        .eq('resource_id', resource_id)
        .neq('status', 'cancelled')
        .lt('start_time', end_time)
        .gt('end_time', start_time);

    if (conflictError) {
        console.error("Conflict checking error during claim:", conflictError);
        return { error: 'Failed to validate schedule availability.' };
    }

    if (conflicts && conflicts.length > 0) {
        return { error: 'This time slot was just booked by the facility. Please select another open slot.' };
    }

    // Insert the PitchSide Booking
    const { error: insertError } = await adminSupabase
        .from('resource_bookings')
        .insert({
            facility_id: facility_id,
            resource_id: resource_id,
            title: 'PitchSide Network Game',
            start_time: start_time,
            end_time: end_time,
            renter_name: 'PitchSide HQ',
            status: status,
            color: '#ccff00' // PitchSide Accent Volt Green to stand out on the Facility's internal calendar
        });

    if (insertError) {
        console.error('Error claiming slot:', insertError);
        return { error: 'Failed to claim the slot. Please try again.' };
    }

    // Phase 12: Notification System to Facility Admin
    // Find the Facility Admin(s) for this facility via profiles
    const { data: adminProfiles } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('facility_id', facility_id)
        .eq('system_role', 'facility_admin');

    if (adminProfiles && adminProfiles.length > 0) {
        const message = `PitchSide HQ has requested a network slot for ${new Date(start_time).toLocaleDateString()} at ${new Date(start_time).toLocaleTimeString()}.`;

        // Notify all valid staff members for that facility with 'booking_request' type
        for (const admin of adminProfiles) {
            await sendNotification(admin.id, message, 'booking_request');
        }
    }

    revalidatePath('/admin/marketplace');
    revalidatePath('/facility');
    return { success: true };
}
