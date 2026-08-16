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

    // 2. Fetch Active Events & Teams Joined or Hosted
    // A. Pickup & Regular Game Bookings
    const { data: userBookings } = await supabase
        .from('bookings')
        .select('game_id, team_id, games(id, title, start_time, event_type, status, host_ids)')
        .eq('user_id', user.id)
        .neq('status', 'cancelled');

    // B. Hosted Events
    const { data: hostedGames } = await supabase
        .from('games')
        .select('id, title, start_time, event_type, status, host_ids')
        .contains('host_ids', [user.id]);

    // C. Tournament & League Registrations (Includes Team Chats)
    const { data: tourneyRegs } = await supabase
        .from('tournament_registrations')
        .select(`
            id, team_id, game_id, status,
            teams:teams(id, name, game_id),
            games:games(id, title, start_time, event_type, status, host_ids)
        `)
        .eq('user_id', user.id)
        .neq('status', 'cancelled');

    // D. Teams where user is Captain
    const { data: captainTeams } = await supabase
        .from('teams')
        .select(`
            id, name, game_id,
            games:games(id, title, start_time, event_type, status)
        `)
        .eq('captain_id', user.id);

    const eventsMap = new Map<string, EventChatItem>();

    // Add hosted games
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

    // Add booked games
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

    // Add tournament & league event chats + team chats
    (tourneyRegs || []).forEach((reg: any) => {
        // 1. Event Level Chat
        if (reg.games && reg.games.id && !eventsMap.has(reg.games.id)) {
            const isHost = (reg.games.host_ids || []).includes(user.id);
            eventsMap.set(reg.games.id, {
                id: reg.games.id,
                title: reg.games.title || 'Tournament',
                start_time: reg.games.start_time,
                event_type: reg.games.event_type || 'Tournament',
                status: reg.games.status || 'active',
                is_host: isHost
            });
        }

        // 2. Team Level Chat (Used in PlayerCommandCenter.tsx on player dashboard)
        if (reg.teams && reg.teams.id && !eventsMap.has(reg.teams.id)) {
            eventsMap.set(reg.teams.id, {
                id: reg.teams.id,
                title: `${reg.teams.name} (${reg.games?.title || 'Team'})`,
                start_time: reg.games?.start_time || new Date().toISOString(),
                event_type: 'Team Chat',
                status: reg.games?.status || 'active',
                is_host: false
            });
        }
    });

    // Add captain teams
    (captainTeams || []).forEach((t: any) => {
        if (t && t.id && !eventsMap.has(t.id)) {
            eventsMap.set(t.id, {
                id: t.id,
                title: `${t.name} (${t.games?.title || 'Team'})`,
                start_time: t.games?.start_time || new Date().toISOString(),
                event_type: 'Team Chat',
                status: t.games?.status || 'active',
                is_host: false
            });
        }
    });

    // 3. Fetch latest message per event/team to get last_message_at and sort by activity
    const allChannelIds = Array.from(eventsMap.keys());
    if (allChannelIds.length > 0) {
        const { data: recentGameMsgs } = await supabase
            .from('messages')
            .select('event_id, content, created_at')
            .in('event_id', allChannelIds)
            .order('created_at', { ascending: false });

        if (recentGameMsgs) {
            recentGameMsgs.forEach((msg: any) => {
                const eventItem = eventsMap.get(msg.event_id);
                if (eventItem && !eventItem.last_message_at) {
                    eventItem.last_message_at = msg.created_at;
                    eventItem.last_message = msg.content;
                }
            });
        }
    }

    // Sort events by last message activity (most active at top)
    const initialEvents: EventChatItem[] = Array.from(eventsMap.values()).sort((a, b) => {
        const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : new Date(a.start_time).getTime() - 100000000000;
        const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : new Date(b.start_time).getTime() - 100000000000;
        return timeB - timeA;
    });

    // 4. Fetch Direct Message Conversation Threads
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

    // Fetch latest message per direct conversation
    const allThreadIds = initialDirects.map((d) => d.id);
    if (allThreadIds.length > 0) {
        const { data: recentThreadMsgs } = await supabase
            .from('messages')
            .select('conversation_id, content, created_at')
            .in('conversation_id', allThreadIds)
            .order('created_at', { ascending: false });

        if (recentThreadMsgs) {
            const threadMap = new Map(initialDirects.map((d) => [d.id, d]));
            recentThreadMsgs.forEach((msg: any) => {
                const threadItem = threadMap.get(msg.conversation_id);
                if (threadItem && !threadItem.last_message_at) {
                    threadItem.last_message_at = msg.created_at;
                    threadItem.last_message = msg.content;
                }
            });
        }
    }

    // Sort direct messages by latest activity
    initialDirects.sort((a, b) => {
        const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : new Date(a.updated_at).getTime();
        const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : new Date(b.updated_at).getTime();
        return timeB - timeA;
    });

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
