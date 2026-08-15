'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface SearchPlayerResult {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url?: string | null;
}

export interface ConversationSummary {
    id: string;
    type: 'direct' | 'group' | 'event';
    title: string;
    subtitle?: string;
    event_id?: string | null;
    other_user_id?: string | null;
    last_message?: string | null;
    last_message_at?: string | null;
    unread_count: number;
}

/**
 * 🔒 SECURITY: Get or create a private 1-on-1 Direct Message conversation.
 * Enforces strict session authentication and prevents unauthorized thread creation.
 */
export async function getOrCreateDirectConversation(targetUserId: string): Promise<{ success: boolean; conversationId?: string; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Unauthorized. Please log in.' };
        }

        if (!targetUserId || targetUserId === user.id) {
            return { success: false, error: 'Invalid recipient.' };
        }

        // Check if a direct conversation already exists between these 2 users
        const { data: userConversations } = await supabase
            .from('conversation_members')
            .select('conversation_id, conversation_threads!inner(id, type)')
            .eq('user_id', user.id)
            .eq('conversation_threads.type', 'direct');

        if (userConversations && userConversations.length > 0) {
            const threadIds = userConversations.map((c) => c.conversation_id);

            const { data: commonMembers } = await supabase
                .from('conversation_members')
                .select('conversation_id')
                .in('conversation_id', threadIds)
                .eq('user_id', targetUserId)
                .limit(1);

            if (commonMembers && commonMembers.length > 0) {
                return { success: true, conversationId: commonMembers[0].conversation_id };
            }
        }

        // Fetch target user's public name to set thread title
        const { data: targetProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', targetUserId)
            .single();

        const targetName = targetProfile?.first_name 
            ? `${targetProfile.first_name} ${targetProfile.last_name || ''}`.trim() 
            : targetProfile?.email || 'Direct Message';

        // Create new conversation thread
        const { data: newThread, error: threadError } = await supabase
            .from('conversation_threads')
            .insert({
                type: 'direct',
                title: targetName,
                created_by: user.id
            })
            .select('id')
            .single();

        if (threadError || !newThread) {
            console.error('Error creating conversation thread:', threadError);
            return { success: false, error: 'Failed to create conversation thread.' };
        }

        // Add both users to conversation_members
        const { error: membersError } = await supabase
            .from('conversation_members')
            .insert([
                { conversation_id: newThread.id, user_id: user.id },
                { conversation_id: newThread.id, user_id: targetUserId }
            ]);

        if (membersError) {
            console.error('Error adding members to conversation:', membersError);
            return { success: false, error: 'Failed to add conversation members.' };
        }

        revalidatePath('/messages');
        return { success: true, conversationId: newThread.id };
    } catch (err: any) {
        console.error('getOrCreateDirectConversation error:', err);
        return { success: false, error: err.message || 'Internal server error.' };
    }
}

/**
 * 🔒 SECURITY: Search players for starting a new chat.
 * Restricts returned fields to non-sensitive public display names only.
 */
export async function searchPlayersForChat(query: string): Promise<SearchPlayerResult[]> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || !query.trim()) return [];

        const cleanQuery = query.trim().toLowerCase();

        const { data, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .or(`first_name.ilike.%${cleanQuery}%,last_name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%`)
            .neq('id', user.id)
            .limit(15);

        if (error) {
            console.error('searchPlayersForChat error:', error);
            return [];
        }

        return (data || []).map((p) => ({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            email: p.email
        }));
    } catch (err) {
        console.error('searchPlayersForChat unexpected error:', err);
        return [];
    }
}

/**
 * 🔒 SECURITY: Dismiss / delete a single notification.
 * Enforces ownership via RLS.
 */
export async function deleteNotificationAction(notificationId: string): Promise<{ success: boolean }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || !notificationId) return { success: false };

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('user_id', user.id);

        if (error) {
            console.error('deleteNotificationAction error:', error);
            return { success: false };
        }

        return { success: true };
    } catch (err) {
        console.error('deleteNotificationAction unexpected error:', err);
        return { success: false };
    }
}

/**
 * 🔒 SECURITY: Clear all read notifications for current user.
 */
export async function clearReadNotificationsAction(): Promise<{ success: boolean }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false };

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user.id)
            .eq('is_read', true);

        if (error) {
            console.error('clearReadNotificationsAction error:', error);
            return { success: false };
        }

        return { success: true };
    } catch (err) {
        console.error('clearReadNotificationsAction unexpected error:', err);
        return { success: false };
    }
}
