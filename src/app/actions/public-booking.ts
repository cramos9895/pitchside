'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendNotification } from '@/lib/email';
import { sendNotification as sendAppNotification } from '@/lib/notifications';
import { NewRequestEmail } from '@/emails/NewRequestEmail';

interface BookingRequestData {
    facilityId: string;
    resourceId: string;
    title: string;
    contactEmail: string;
    startTime: string; // ISO 
    endTime: string; // ISO
    isContractRequest?: boolean;
}

export async function submitBookingRequest(data: BookingRequestData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'You must be logged in to request a booking.' };
    }

    if (!data.facilityId || !data.resourceId || !data.title || !data.startTime || !data.endTime) {
        return { success: false, error: 'Missing required booking fields.' };
    }

    const startTimeObj = new Date(data.startTime);
    const endTimeObj = new Date(data.endTime);

    if (endTimeObj <= startTimeObj) {
        return { success: false, error: 'End time must be after start time.' };
    }

    // Use admin client to query bookings securely for conflicts, bypassing RLS
    const adminSupabase = createAdminClient();

    // Collision Check
    const { data: conflicts, error: conflictError } = await adminSupabase
        .from('resource_bookings')
        .select('id')
        .eq('resource_id', data.resourceId)
        .neq('status', 'cancelled')
        .lt('start_time', data.endTime)
        .gt('end_time', data.startTime);

    if (conflictError) {
        console.error("Conflict checking error:", conflictError);
        return { success: false, error: 'Failed to validate schedule availability.' };
    }

    if (conflicts && conflicts.length > 0) {
        return { success: false, error: 'This time slot is no longer available.' };
    }

    // Insert the Booking Request
    // We can use the regular authenticated client because we added an RLS policy allowing INSERT for pending bookings by the user
    const { error: insertError } = await supabase
        .from('resource_bookings')
        .insert({
            facility_id: data.facilityId,
            resource_id: data.resourceId,
            title: data.title,
            start_time: data.startTime,
            end_time: data.endTime,
            renter_name: 'Guest Request',
            contact_email: data.contactEmail,
            user_id: user.id,
            status: data.isContractRequest ? 'pending_contract' : 'pending_facility_review',
            payment_status: data.isContractRequest ? 'unpaid' : null,
            color: data.isContractRequest ? '#EAB308' : '#3B82F6' // Yellow for contract, Blue for generic pending
        });

    if (insertError) {
        console.error('Error submitting booking request:', insertError);
        return { success: false, error: 'Failed to submit the request. Please try again.' };
    }

    // Notification Pipeline to Facility Admin
    // Find the Facility Admin(s) for this facility via profiles using admin client
    const { data: adminProfiles } = await adminSupabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('facility_id', data.facilityId)
        .eq('system_role', 'facility_admin');

    const { data: resourceData } = await adminSupabase
        .from('resources')
        .select('name')
        .eq('id', data.resourceId)
        .single();

    const resourceName = resourceData?.name || 'A Facility Resource';

    if (adminProfiles && adminProfiles.length > 0) {
        const message = `New Public Booking Request for ${new Date(data.startTime).toLocaleDateString()} at ${new Date(data.startTime).toLocaleTimeString()}.`;

        // Notify all valid staff members for that facility specifically with booking_request
        for (const admin of adminProfiles) {
            await sendAppNotification(admin.id, message, 'booking_request');

            if (admin.email) {
                const adminName = admin.full_name || 'Admin';
                const requestedDates = [`${new Date(data.startTime).toLocaleDateString()} at ${new Date(data.startTime).toLocaleTimeString()}`];

                await sendNotification({
                    to: admin.email,
                    subject: `Action Required: New Request for ${resourceName}`,
                    type: 'new_request',
                    react: NewRequestEmail({
                        userName: data.title + ` (${data.contactEmail})`,
                        resourceName: resourceName,
                        requestedDates: requestedDates
                    })
                });
            }
        }
    }

    return { success: true };
}
