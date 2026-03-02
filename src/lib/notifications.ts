import { createAdminClient } from './supabase/admin';

export async function sendNotification(userId: string, message: string, type: string = 'info') {
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
        .from('notifications')
        .insert({
            user_id: userId,
            message: message,
            type: type
        });

    if (error) {
        console.error('Failed to create notification:', error);
        return { success: false, error };
    }

    return { success: true };
}
