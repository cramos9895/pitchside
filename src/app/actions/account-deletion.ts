'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * Server Action: deleteUserAccountAction
 * 
 * Allows an authenticated user to permanently delete their account and wipe
 * their personal identifiable information (PII) across all database records.
 * Complies with Apple App Store Review Guideline 5.1.1(v) & Google Play Store User Data Policy.
 */
export async function deleteUserAccountAction() {
    try {
        const supabase = await createClient();

        // 1. Verify user session
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return { success: false, error: 'You must be logged in to delete your account.' };
        }

        const userId = user.id;

        // 2. Invoke database RPC function to scrub personal data and delete account
        const { data: rpcResult, error: rpcError } = await supabase.rpc('delete_user_account');

        const isRpcSuccess = !rpcError && (rpcResult as any)?.success === true;

        if (!isRpcSuccess) {
            console.warn('[Account Deletion] RPC execution encountered issue, executing administrative cleanup:', rpcError || (rpcResult as any)?.error);
            
            const supabaseAdmin = createAdminClient();

            // Unassign references in teams, games, credits, and bookings
            await supabaseAdmin.from('bookings').update({ buyer_id: null }).eq('buyer_id', userId);
            await supabaseAdmin.from('teams').update({ captain_id: null }).eq('captain_id', userId);
            await supabaseAdmin.from('games').update({ mvp_player_id: null }).eq('mvp_player_id', userId);
            await supabaseAdmin.from('credit_transactions').update({ admin_id: null }).eq('admin_id', userId);

            // Delete user participation records
            await supabaseAdmin.from('user_push_tokens').delete().eq('user_id', userId);
            await supabaseAdmin.from('notifications').delete().eq('user_id', userId);
            await supabaseAdmin.from('conversation_members').delete().eq('user_id', userId);
            await supabaseAdmin.from('messages').delete().eq('user_id', userId);
            await supabaseAdmin.from('team_players').delete().eq('user_id', userId);
            await supabaseAdmin.from('match_players').delete().eq('user_id', userId);
            await supabaseAdmin.from('referee_applications').delete().eq('user_id', userId);
            await supabaseAdmin.from('tournament_registrations').delete().eq('user_id', userId);
            await supabaseAdmin.from('bookings').delete().eq('user_id', userId);
            await supabaseAdmin.from('resource_bookings').delete().eq('user_id', userId);
            await supabaseAdmin.from('waiver_signatures').delete().eq('user_id', userId);

            // Delete profile
            await supabaseAdmin.from('profiles').delete().eq('id', userId);

            // Delete auth user via Admin API
            const { error: adminDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (adminDeleteError) {
                console.error('[Account Deletion] Admin Delete Error:', adminDeleteError);
                return { success: false, error: 'Could not complete account deletion. Please contact support.' };
            }
        }

        // 3. Terminate active auth session
        await supabase.auth.signOut();

        // 4. Clear all session cookies
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        for (const cookie of allCookies) {
            if (cookie.name.includes('sb-') || cookie.name.includes('supabase') || cookie.name.includes('session')) {
                cookieStore.delete(cookie.name);
            }
        }

        revalidatePath('/', 'layout');

        return { success: true, message: 'Your account and personal data have been permanently deleted.' };
    } catch (err: any) {
        console.error('[Account Deletion] Unexpected error:', err);
        return { success: false, error: err?.message || 'An unexpected error occurred while deleting your account.' };
    }
}
