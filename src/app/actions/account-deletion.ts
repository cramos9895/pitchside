'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * Server Action: deleteUserAccountAction
 * 
 * Allows an authenticated user to permanently delete their account and anonymize
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

        // 2. Invoke database RPC function to scrub personal data and anonymize records
        const { data: rpcResult, error: rpcError } = await supabase.rpc('delete_user_account');

        const isRpcSuccess = !rpcError && (rpcResult as any)?.success === true;

        if (!isRpcSuccess) {
            console.warn('[Account Deletion] RPC execution encountered issue, executing administrative cleanup:', rpcError || (rpcResult as any)?.error);
            
            const supabaseAdmin = createAdminClient();
            
            // Scrub profile PII
            await supabaseAdmin.from('profiles').update({
                first_name: 'Deleted',
                last_name: 'Player',
                phone_number: null,
                zip_code: null,
                avatar_url: null,
                bio: '',
                is_deleted: true
            }).eq('id', userId);

            // Unassign captaincy to prevent FK constraint issues
            await supabaseAdmin.from('teams').update({ captain_id: null }).eq('captain_id', userId);

            // Delete push tokens, notifications, memberships
            await supabaseAdmin.from('user_push_tokens').delete().eq('user_id', userId);
            await supabaseAdmin.from('notifications').delete().eq('user_id', userId);
            await supabaseAdmin.from('conversation_members').delete().eq('user_id', userId);
            await supabaseAdmin.from('team_players').delete().eq('user_id', userId);
            await supabaseAdmin.from('match_players').delete().eq('user_id', userId);
            await supabaseAdmin.from('referee_applications').delete().eq('user_id', userId);

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
