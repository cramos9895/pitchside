'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper to verify admin/host role or specific game host
async function verifyHostOrAdmin(supabase: any, eventId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, system_role')
        .eq('id', user.id)
        .single();

    const isGlobalHost = profile?.role === 'admin' || profile?.role === 'master_admin' || profile?.role === 'host' || profile?.system_role === 'super_admin';
    if (isGlobalHost) return user;

    if (eventId) {
        const { data: game } = await supabase
            .from('games')
            .select('host_ids')
            .eq('id', eventId)
            .single();
            
        if (game?.host_ids?.includes(user.id)) {
            return user;
        }
    }

    throw new Error('Forbidden: Only hosts and admins can perform this action.');
}

export async function getPlayerCheckInDetails(scannedUserId: string, eventId: string) {
    const supabase = await createClient();
    
    // Verify caller is admin/host or game host
    await verifyHostOrAdmin(supabase, eventId);

    // 1. Get Profile & Suspensions
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, is_banned, banned_until, ban_reason')
        .eq('id', scannedUserId)
        .single();

    if (profileError || !profile) throw new Error('Player not found');

    // 2. Get Event Identity Photo
    const { data: identity } = await supabase
        .from('event_identities')
        .select('photo_url')
        .eq('user_id', scannedUserId)
        .eq('event_id', eventId)
        .maybeSingle();

    // 3. Get Check-In Status
    const { data: checkIn } = await supabase
        .from('event_check_ins')
        .select('checked_in_at')
        .eq('user_id', scannedUserId)
        .eq('event_id', eventId)
        .maybeSingle();

    // 3.5 Get Game Info for payment type
    const { data: game } = await supabase
        .from('games')
        .select('payment_collection_type')
        .eq('id', eventId)
        .single();

    // 4. Get Financial Status (Tournament Registrations)
    // Find the team they are registered for in this event
    const { data: registration } = await supabase
        .from('tournament_registrations')
        .select('status, team_id, role, cash_paid_current_round, teams(name, captain_id)')
        .eq('user_id', scannedUserId)
        .or(`game_id.eq.${eventId},league_id.eq.${eventId}`)
        .neq('status', 'cancelled')
        .maybeSingle();

    return {
        profile,
        identityPhoto: identity?.photo_url || null,
        isCheckedIn: !!checkIn,
        checkedInAt: checkIn?.checked_in_at || null,
        registration: registration ? {
            status: registration.status,
            role: registration.role,
            isCashGame: game?.payment_collection_type === 'cash',
            cashCollected: registration.cash_paid_current_round,
            isCaptain: Array.isArray(registration.teams) 
                ? registration.teams[0]?.captain_id === scannedUserId 
                : (registration.teams as any)?.captain_id === scannedUserId,
            teamName: (Array.isArray(registration.teams) ? registration.teams[0]?.name : (registration.teams as any)?.name) || 'Unknown Team'
        } : null
    };
}

export async function uploadEventIdentityPhoto(formData: FormData) {
    const supabase = await createClient();
    const userId = formData.get('userId') as string;
    const eventId = formData.get('eventId') as string;
    const photoFile = formData.get('photo') as File;

    const host = await verifyHostOrAdmin(supabase, eventId);

    if (!userId || !eventId || !photoFile) {
        throw new Error('Missing required fields');
    }

    const fileExt = photoFile.name.split('.').pop() || 'jpg';
    const filePath = `${eventId}/${userId}.${fileExt}`;

    // Upload to 'identities' bucket
    const { error: uploadError } = await supabase.storage
        .from('identities')
        .upload(filePath, photoFile, { upsert: true, contentType: photoFile.type });

    if (uploadError) {
        console.error('Identity upload error:', uploadError);
        throw new Error('Failed to upload identity photo');
    }

    const { data: publicUrlData } = supabase.storage
        .from('identities')
        .getPublicUrl(filePath);

    const cacheBustedUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    // Insert into event_identities
    const { error: dbError } = await supabase
        .from('event_identities')
        .upsert({
            user_id: userId,
            event_id: eventId,
            photo_url: cacheBustedUrl
        }, { onConflict: 'user_id,event_id' });

    if (dbError) {
        console.error('DB Identity error:', dbError);
        throw new Error('Failed to save identity record');
    }

    return publicUrlData.publicUrl;
}

export async function executeCheckIn(userId: string, eventId: string, eventType: 'rolling' | 'tournament' | 'pickup' = 'rolling') {
    const supabase = await createClient();
    const host = await verifyHostOrAdmin(supabase, eventId);

    // If game is cash collection, assume cash is collected at check-in
    const { data: game } = await supabase
        .from('games')
        .select('payment_collection_type')
        .eq('id', eventId)
        .single();

    if (game?.payment_collection_type === 'cash') {
        await supabase
            .from('tournament_registrations')
            .update({ cash_paid_current_round: true })
            .eq('user_id', userId)
            .or(`game_id.eq.${eventId},league_id.eq.${eventId}`);
    }

    const { error } = await supabase
        .from('event_check_ins')
        .insert({
            event_id: eventId,
            event_type: eventType,
            user_id: userId,
            checked_by: host.id
        });

    if (error && error.code !== '23505') { // Ignore unique violation if already checked in
        console.error('Check-in error:', error);
        throw new Error('Failed to execute check-in');
    }

    revalidatePath('/rolling-leagues/[id]', 'page');
    return { success: true };
}

export async function undoCheckIn(userId: string, eventId: string) {
    const supabase = await createClient();
    const host = await verifyHostOrAdmin(supabase, eventId);

    // Get the game to see if it's a cash game
    const { data: game } = await supabase
        .from('games')
        .select('payment_collection_type')
        .eq('id', eventId)
        .single();

    if (game?.payment_collection_type === 'cash') {
        // Revert cash collection status
        await supabase
            .from('tournament_registrations')
            .update({ cash_paid_current_round: false })
            .eq('user_id', userId)
            .or(`game_id.eq.${eventId},league_id.eq.${eventId}`);
    }

    // Delete check-in record
    const { error } = await supabase
        .from('event_check_ins')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId);

    if (error) {
        console.error('Check-in deletion error:', error);
        throw new Error('Failed to undo check-in');
    }

    return { success: true };
}
