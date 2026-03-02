'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
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
    const resourceTypeId = formData.get('resource_type_id') as string;

    // Extract array of selected activity IDs. Checkboxes return multiple values for the same name if using standard FormData,
    // or we can expect a JSON stringified array. Let's assume a JSON string `activity_ids` for simplicity in the UI.
    const activityIdsRaw = formData.get('activity_ids') as string;
    let activityIds: string[] = [];
    try {
        if (activityIdsRaw) activityIds = JSON.parse(activityIdsRaw);
    } catch (e) {
        console.error("Failed to parse activity_ids", e);
    }

    if (!name || !resourceTypeId || activityIds.length === 0) {
        return { error: 'Missing required fields. Please ensure a Name, Type, and at least one Activity is selected.' };
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
    const { data: newResource, error: insertError } = await adminSupabase
        .from('resources')
        .insert({
            facility_id: targetFacilityId,
            name: name,
            resource_type_id: resourceTypeId
        })
        .select()
        .single();

    if (insertError || !newResource) {
        console.error('[FACILITY ACTION] Resource Creation Error:', insertError);
        return { error: 'Failed to create resource. Please try again.' };
    }

    // 3. Insert into resource_activities explicitly
    const mappingData = activityIds.map(actId => ({
        resource_id: newResource.id,
        activity_type_id: actId
    }));

    const { error: mappingError } = await adminSupabase
        .from('resource_activities')
        .insert(mappingData);

    if (mappingError) {
        console.error('[FACILITY ACTION] Resource Activity Mapping Error:', mappingError);
        return { error: 'Resource created, but failed to link activities. Please edit and try again.' };
    }

    // 4. Revalidate the view so the UI instantly updates
    revalidatePath('/facility/resources');

    return { success: true };
}

export async function toggleFacilityActivity(facilityId: string, activityTypeId: string, isCurrentlyActive: boolean) {
    const supabaseAdmin = createAdminClient();

    // Verify permissions
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabaseAdmin.from('profiles').select('system_role, role, facility_id').eq('id', user.id).single();
    const isSuperAdmin = profile?.system_role === 'super_admin' || profile?.role === 'master_admin';
    if (!isSuperAdmin && profile?.facility_id !== facilityId) {
        return { error: 'Unauthorized to modify this facility' };
    }

    if (isCurrentlyActive) {
        // Deactivate: Remove from facility_activities
        const { error } = await supabaseAdmin
            .from('facility_activities')
            .delete()
            .match({ facility_id: facilityId, activity_type_id: activityTypeId });

        if (error) return { error: 'Failed to deactivate activity' };
    } else {
        // Activate: Insert into facility_activities
        const { error } = await supabaseAdmin
            .from('facility_activities')
            .insert([{ facility_id: facilityId, activity_type_id: activityTypeId }]);

        if (error) return { error: 'Failed to activate activity' };
    }

    revalidatePath('/facility/settings/activities');
    return { success: true };
}

export async function updateResource(id: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase.from('profiles').select('system_role, role, facility_id').eq('id', user.id).single();
    if (!profile) return { error: 'Profile not found' };

    const isSuperAdmin = profile.system_role === 'super_admin' || profile.role === 'master_admin';
    if (profile.system_role !== 'facility_admin' && !isSuperAdmin) {
        return { error: 'Forbidden. Facility Admin rights required.' };
    }

    const name = formData.get('name') as string;
    const resourceTypeId = formData.get('resource_type_id') as string;

    const activityIdsRaw = formData.get('activity_ids') as string;
    let activityIds: string[] = [];
    try {
        if (activityIdsRaw) activityIds = JSON.parse(activityIdsRaw);
    } catch (e) {
        console.error("Failed to parse activity_ids", e);
    }

    if (!name || !resourceTypeId || activityIds.length === 0) {
        return { error: 'Missing required fields. Please ensure a Name, Type, and at least one Activity is selected.' };
    }

    const adminSupabase = createAdminClient();

    // 1. Verify resource exists and belongs to facility (if not super admin)
    const { data: existingResource } = await adminSupabase.from('resources').select('*').eq('id', id).single();
    if (!existingResource) return { error: 'Resource not found' };

    if (!isSuperAdmin && existingResource.facility_id !== profile.facility_id) {
        return { error: 'Unauthorized to edit this resource' };
    }

    // 2. Update parent resource
    const { error: updateError } = await adminSupabase
        .from('resources')
        .update({ name, resource_type_id: resourceTypeId })
        .eq('id', id);

    if (updateError) return { error: 'Failed to update resource properties.' };

    // 3. Update activities (Delete all existing mappings, then re-insert)
    await adminSupabase.from('resource_activities').delete().eq('resource_id', id);

    const mappingData = activityIds.map(actId => ({
        resource_id: id,
        activity_type_id: actId
    }));

    const { error: mappingError } = await adminSupabase.from('resource_activities').insert(mappingData);

    if (mappingError) {
        return { error: 'Resource properties updated, but failed to link new activities.' };
    }

    revalidatePath('/facility/resources');
    return { success: true };
}

export async function deleteResource(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase.from('profiles').select('system_role, role, facility_id').eq('id', user.id).single();
    if (!profile) return { error: 'Profile not found' };

    const isSuperAdmin = profile.system_role === 'super_admin' || profile.role === 'master_admin';
    if (profile.system_role !== 'facility_admin' && !isSuperAdmin) {
        return { error: 'Forbidden. Facility Admin rights required.' };
    }

    const adminSupabase = createAdminClient();

    const { data: existingResource } = await adminSupabase.from('resources').select('*').eq('id', id).single();
    if (!existingResource) return { error: 'Resource not found' };

    if (!isSuperAdmin && existingResource.facility_id !== profile.facility_id) {
        return { error: 'Unauthorized to delete this resource' };
    }

    // Delete resource (cascade should handle mappings)
    const { error } = await adminSupabase.from('resources').delete().eq('id', id);

    if (error) {
        return { error: 'Failed to delete resource. It may be attached to existing games.' };
    }

    revalidatePath('/facility/resources');
    return { success: true };
}

export async function updateLeague(leagueId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase.from('profiles').select('system_role, role, facility_id').eq('id', user.id).single();
    if (!profile) return { error: 'Profile not found' };

    const isSuperAdmin = profile.system_role === 'super_admin' || profile.role === 'master_admin';
    if (profile.system_role !== 'facility_admin' && !isSuperAdmin) {
        return { error: 'Forbidden. Facility Admin rights required.' };
    }

    const adminSupabase = createAdminClient();

    // Verify league ownership
    const { data: existingLeague } = await adminSupabase.from('leagues').select('facility_id').eq('id', leagueId).single();
    if (!existingLeague) return { error: 'League not found' };

    if (!isSuperAdmin && existingLeague.facility_id !== profile.facility_id) {
        return { error: 'Unauthorized to edit this league' };
    }

    // Extract form data
    const name = formData.get('name') as string;
    const season = formData.get('season') as string;
    const activity_id = formData.get('activity_id') as string;
    const price = formData.get('price') as string;
    const max_roster = formData.get('max_roster') as string;
    const min_roster = formData.get('min_roster') as string;
    const max_teams = formData.get('max_teams') as string;
    const start_date = formData.get('start_date') as string;
    const end_date = formData.get('end_date') as string;

    const format = formData.get('format') as string;
    const game_length = formData.get('game_length') as string;
    const game_periods = formData.get('game_periods') as string;
    const game_days = formData.get('game_days') as string;
    const has_playoffs = formData.get('has_playoffs') === 'on';
    const playoff_spots = formData.get('playoff_spots') as string;

    const time_range_start = formData.get('time_range_start') as string;
    const time_range_end = formData.get('time_range_end') as string;

    // Parse resources
    const resourceIdsRaw = formData.get('resource_ids') as string;
    let resourceIds: string[] = [];
    try {
        if (resourceIdsRaw) resourceIds = JSON.parse(resourceIdsRaw);
    } catch (e) {
        console.error("Failed to parse resource_ids", e);
    }

    const { error: updateError } = await adminSupabase
        .from('leagues')
        .update({
            name,
            season,
            activity_id: activity_id ? activity_id : null,
            price: price ? parseFloat(price) : null,
            max_roster: max_roster ? parseInt(max_roster) : null,
            min_roster: min_roster ? parseInt(min_roster) : null,
            max_teams: max_teams ? parseInt(max_teams) : null,
            start_date: start_date || null,
            end_date: end_date || null,
            format: format || null,
            game_length: game_length ? parseInt(game_length) : null,
            game_periods: game_periods || null,
            game_days: game_days || null,
            has_playoffs,
            playoff_spots: has_playoffs && playoff_spots ? parseInt(playoff_spots) : null,
            time_range_start: time_range_start || null,
            time_range_end: time_range_end || null,
        })
        .eq('id', leagueId);

    if (updateError) {
        console.error("Error updating league:", updateError);
        return { error: 'Failed to update the league.' };
    }

    // Process League Resources
    await adminSupabase.from('league_resources').delete().eq('league_id', leagueId);

    if (resourceIds.length > 0) {
        const resourceLinks = resourceIds.map(rId => ({
            league_id: leagueId,
            resource_id: rId
        }));

        const { error: linkError } = await adminSupabase.from('league_resources').insert(resourceLinks);
        if (linkError) {
            console.error("Error linking resources:", linkError);
            return { error: 'League updated, but failed to link resources.' };
        }
    }

    revalidatePath(`/facility/leagues`);
    revalidatePath(`/facility/leagues/${leagueId}`);
    return { success: true };
}

export async function deleteLeague(leagueId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Unauthorized' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('facility_id, system_role, role')
        .eq('id', user.id)
        .single();

    if (!profile) return { error: 'Profile not found' };

    const isSuperAdmin = profile.system_role === 'super_admin' || profile.role === 'master_admin';
    if (profile.system_role !== 'facility_admin' && !isSuperAdmin) {
        return { error: 'Forbidden. Facility Admin rights required.' };
    }

    const adminSupabase = createAdminClient();

    // Verify league ownership
    const { data: existingLeague } = await adminSupabase.from('leagues').select('facility_id').eq('id', leagueId).single();
    if (!existingLeague) return { error: 'League not found' };

    if (!isSuperAdmin && existingLeague.facility_id !== profile.facility_id) {
        return { error: 'Unauthorized to delete this league' };
    }

    // Attempt the deletion
    const { error: deleteError } = await adminSupabase
        .from('leagues')
        .delete()
        .eq('id', leagueId);

    if (deleteError) {
        console.error("Error deleting league:", deleteError);
        return { error: 'Failed to delete the league.' };
    }

    revalidatePath(`/facility/leagues`);
    return { success: true };
}

export async function cancelLeague(leagueId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Unauthorized' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('facility_id, system_role, role')
        .eq('id', user.id)
        .single();

    if (!profile) return { error: 'Profile not found' };

    const isSuperAdmin = profile.system_role === 'super_admin' || profile.role === 'master_admin';
    if (profile.system_role !== 'facility_admin' && !isSuperAdmin) {
        return { error: 'Forbidden. Facility Admin rights required.' };
    }

    const adminSupabase = createAdminClient();

    // Verify league ownership
    const { data: existingLeague } = await adminSupabase.from('leagues').select('facility_id, status').eq('id', leagueId).single();
    if (!existingLeague) return { error: 'League not found' };

    if (!isSuperAdmin && existingLeague.facility_id !== profile.facility_id) {
        return { error: 'Unauthorized to cancel this league' };
    }

    // Cancel the league
    const { error: cancelError } = await adminSupabase
        .from('leagues')
        .update({ status: 'cancelled' })
        .eq('id', leagueId);

    if (cancelError) {
        console.error("Error cancelling league:", cancelError);
        return { error: 'Failed to cancel the league.' };
    }

    revalidatePath(`/facility/leagues`);
    revalidatePath(`/facility/leagues/${leagueId}`);
    return { success: true };
}

export async function createBooking(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Unauthorized' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('facility_id, system_role, role')
        .eq('id', user.id)
        .single();

    if (!profile) return { error: 'Profile not found' };

    const isSuperAdmin = profile.system_role === 'super_admin' || profile.role === 'master_admin';
    if (profile.system_role !== 'facility_admin' && !isSuperAdmin) {
        return { error: 'Forbidden. Facility Admin rights required to create bookings.' };
    }

    const facilityId = profile.facility_id;
    if (!isSuperAdmin && !facilityId) {
        return { error: 'No facility assigned to this profile.' };
    }

    const resource_id = formData.get('resource_id') as string;
    const title = formData.get('title') as string;
    const start_time = formData.get('start_time') as string;
    const end_time = formData.get('end_time') as string;
    const renter_name = formData.get('renter_name') as string;

    if (!resource_id || !title || !start_time || !end_time) {
        return { error: 'Missing required fields. Needs Resource, Title, Start Time, and End Time.' };
    }

    const startTimeObj = new Date(start_time);
    const endTimeObj = new Date(end_time);

    if (endTimeObj <= startTimeObj) {
        return { error: 'End time must be after start time.' };
    }

    const adminSupabase = createAdminClient();

    // Collision Check: Are there any overlapping boundaries for this exact resource?
    const { data: conflicts, error: conflictError } = await adminSupabase
        .from('resource_bookings')
        .select('id')
        .eq('resource_id', resource_id)
        .neq('status', 'cancelled')
        .lt('start_time', end_time)
        .gt('end_time', start_time);

    if (conflictError) {
        console.error("Conflict checking error:", conflictError);
        return { error: 'Failed to validate schedule availability.' };
    }

    if (conflicts && conflicts.length > 0) {
        return { error: 'This time slot overlaps with an existing booking for the selected resource.' };
    }

    // Insert the Booking
    const { error: insertError } = await adminSupabase
        .from('resource_bookings')
        .insert({
            facility_id: facilityId,
            resource_id: resource_id,
            title: title,
            start_time: start_time,
            end_time: end_time,
            renter_name: renter_name || null,
            status: 'confirmed',
            color: '#3B82F6' // Default PitchSide blue
        });

    if (insertError) {
        console.error("Failed to create booking:", insertError);
        return { error: 'Failed to save booking.' };
    }

    revalidatePath('/facility/calendar');
    revalidatePath('/facility/display');
    return { success: true };
}

export async function updateBooking(bookingId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('facility_id, system_role, role')
        .eq('id', user.id)
        .single();

    if (!profile) return { error: 'Profile not found' };

    const isSuperAdmin = profile.system_role === 'super_admin' || profile.role === 'master_admin';
    if (profile.system_role !== 'facility_admin' && !isSuperAdmin) {
        return { error: 'Forbidden. Facility Admin rights required to update bookings.' };
    }

    const facilityId = profile.facility_id;
    if (!isSuperAdmin && !facilityId) {
        return { error: 'No facility assigned to this profile.' };
    }

    const resource_id = formData.get('resource_id') as string;
    const title = formData.get('title') as string;
    const start_time = formData.get('start_time') as string;
    const end_time = formData.get('end_time') as string;
    const renter_name = formData.get('renter_name') as string;

    if (!resource_id || !title || !start_time || !end_time) {
        return { error: 'Missing required fields.' };
    }

    const startTimeObj = new Date(start_time);
    const endTimeObj = new Date(end_time);

    if (endTimeObj <= startTimeObj) {
        return { error: 'End time must be after start time.' };
    }

    const adminSupabase = createAdminClient();

    // Collision Check Exclusing Current Booking
    const { data: conflicts, error: conflictError } = await adminSupabase
        .from('resource_bookings')
        .select('id')
        .eq('resource_id', resource_id)
        .neq('id', bookingId)
        .neq('status', 'cancelled')
        .lt('start_time', end_time)
        .gt('end_time', start_time);

    if (conflictError) {
        console.error("Conflict checking error:", conflictError);
        return { error: 'Failed to validate schedule availability.' };
    }

    if (conflicts && conflicts.length > 0) {
        return { error: 'This time slot overlaps with an existing booking for the selected resource.' };
    }

    const { error: updateError } = await adminSupabase
        .from('resource_bookings')
        .update({
            resource_id: resource_id,
            title: title,
            start_time: start_time,
            end_time: end_time,
            renter_name: renter_name || null,
        })
        .eq('id', bookingId);

    if (updateError) {
        console.error("Failed to update booking:", updateError);
        return { error: 'Failed to save booking.' };
    }

    revalidatePath('/facility/calendar');
    revalidatePath('/facility/display');
    return { success: true };
}

export async function deleteBooking(bookingId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('facility_id, system_role, role')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.system_role === 'super_admin' || profile?.role === 'master_admin';
    if (profile?.system_role !== 'facility_admin' && !isSuperAdmin) {
        return { error: 'Forbidden.' };
    }

    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
        .from('resource_bookings')
        .delete()
        .eq('id', bookingId);

    if (error) {
        console.error("Failed to delete booking:", error);
        return { error: 'Failed to delete booking.' };
    }

    revalidatePath('/facility/calendar');
    revalidatePath('/facility/display');
    return { success: true };
}

export async function updateBookingStatus(bookingId: string, status: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase.from('profiles').select('system_role, role, facility_id').eq('id', user.id).single();
    if (!profile) return { error: 'Profile not found' };

    const isSuperAdmin = profile.system_role === 'super_admin' || profile.role === 'master_admin';
    if (profile.system_role !== 'facility_admin' && !isSuperAdmin) {
        return { error: 'Forbidden. Facility Admin rights required.' };
    }

    const adminSupabase = createAdminClient();

    const { data: existingBooking } = await adminSupabase.from('resource_bookings').select('*').eq('id', bookingId).single();
    if (!existingBooking) return { error: 'Booking not found' };

    if (!isSuperAdmin && existingBooking.facility_id !== profile.facility_id) {
        return { error: 'Unauthorized to update this booking' };
    }

    const { error } = await adminSupabase.from('resource_bookings').update({ status }).eq('id', bookingId);

    if (error) {
        return { error: 'Failed to update booking status.' };
    }

    revalidatePath('/facility/calendar');
    return { success: true };
}
