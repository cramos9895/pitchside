import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MessagesClientPage, EventChatItem, DirectChatItem } from '@/components/messages/MessagesClientPage';

export const metadata = {
    title: 'Messages | PitchSide',
    description: 'Central hub for event chats, teammates, and direct messaging.'
};

export default async function MessagesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login?returnUrl=/messages');
    }

    // 1. Fetch User Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('id', user.id)
        .single();

    // 2. Fetch Active Events Joined or Hosted
    const { data: userBookings } = await supabase
        .from('bookings')
        .select('game_id, games(id, title, start_time, event_type, status, host_ids)')
        .eq('user_id', user.id)
        .neq('status', 'cancelled');

    const { data: hostedGames } = await supabase
        .from('games')
        .select('id, title, start_time, event_type, status, host_ids')
        .contains('host_ids', [user.id]);

    const eventsMap = new Map<string, EventChatItem>();

    (hostedGames || []).forEach((g: any) => {
        if (g && g.id) {
            eventsMap.set(g.id, {
                id: g.id,
                title: g.title || 'Hosted Event',
                start_time: g.start_time,
                event_type: g.event_type || 'Pickup',
                status: g.status || 'scheduled',
                is_host: true
            });
        }
    });

    (userBookings || []).forEach((b: any) => {
        const g = b.games;
        if (g && g.id && !eventsMap.has(g.id)) {
            const isHost = (g.host_ids || []).includes(user.id);
            eventsMap.set(g.id, {
                id: g.id,
                title: g.title || 'Joined Game',
                start_time: g.start_time,
                event_type: g.event_type || 'Pickup',
                status: g.status || 'scheduled',
                is_host: isHost
            });
        }
    });

    const initialEvents: EventChatItem[] = Array.from(eventsMap.values()).sort(
        (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );

    // 3. Fetch Direct Message Conversation Threads
    const { data: memberRows } = await supabase
        .from('conversation_members')
        .select('conversation_id, conversation_threads(id, title, type, updated_at)')
        .eq('user_id', user.id);

    const initialDirects: DirectChatItem[] = [];

    if (memberRows) {
        for (const row of memberRows) {
            const thread = row.conversation_threads as any;
            if (thread && thread.type === 'direct') {
                initialDirects.push({
                    id: thread.id,
                    title: thread.title || 'Direct Message',
                    updated_at: thread.updated_at
                });
            }
        }
    }

    initialDirects.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return (
        <MessagesClientPage
            currentUser={{
                id: user.id,
                email: user.email,
                first_name: profile?.first_name || '',
                last_name: profile?.last_name || ''
            }}
            initialEvents={initialEvents}
            initialDirects={initialDirects}
        />
    );
}
