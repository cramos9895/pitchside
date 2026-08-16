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

    // 2. Fetch Active Events & Teams (Robust 2-step lookup)
    const { data: userBookings } = await supabase
        .from('bookings')
        .select('game_id, team_id')
        .eq('user_id', user.id)
        .neq('status', 'cancelled');

    const { data: tourneyRegs } = await supabase
        .from('tournament_registrations')
        .select('game_id, team_id')
        .eq('user_id', user.id)
        .neq('status', 'cancelled');

    const { data: captainTeams } = await supabase
        .from('teams')
        .select('id, game_id')
        .eq('captain_id', user.id);

    const bookedGameIds = new Set<string>();
    const userTeamIds = new Set<string>();

    (userBookings || []).forEach((b) => {
        if (b.game_id) bookedGameIds.add(b.game_id);
        if (b.team_id) userTeamIds.add(b.team_id);
    });

    (tourneyRegs || []).forEach((tr) => {
        if (tr.game_id) bookedGameIds.add(tr.game_id);
        if (tr.team_id) userTeamIds.add(tr.team_id);
    });

    (captainTeams || []).forEach((t) => {
        if (t.id) userTeamIds.add(t.id);
        if (t.game_id) bookedGameIds.add(t.game_id);
    });

    // Fetch all games the user is booked in OR is hosting
    const gameIdsArray = Array.from(bookedGameIds);
    let gamesQuery = supabase
        .from('games')
        .select('id, title, start_time, event_type, status, host_ids');

    if (gameIdsArray.length > 0) {
        gamesQuery = gamesQuery.or(`id.in.(${gameIdsArray.join(',')}),host_ids.cs.{"${user.id}"}`);
    } else {
        gamesQuery = gamesQuery.contains('host_ids', [user.id]);
    }

    const { data: gamesData } = await gamesQuery;

    // Fetch all teams the user belongs to
    const teamIdsArray = Array.from(userTeamIds);
    let teamsData: any[] = [];
    if (teamIdsArray.length > 0) {
        const { data: teamsRes } = await supabase
            .from('teams')
            .select('id, name, game_id, games:games(id, title, start_time, status)')
            .in('id', teamIdsArray);
        if (teamsRes) teamsData = teamsRes;
    }

    const eventsMap = new Map<string, EventChatItem>();

    // Add games
    (gamesData || []).forEach((g: any) => {
        if (g && g.id) {
            const isHost = (g.host_ids || []).includes(user.id);
            eventsMap.set(g.id, {
                id: g.id,
                title: g.title || 'Event Chat',
                start_time: g.start_time,
                event_type: g.event_type || 'Pickup',
                status: g.status || 'scheduled',
                is_host: isHost
            });
        }
    });

    // Add team chats
    (teamsData || []).forEach((t: any) => {
        if (t && t.id && !eventsMap.has(t.id)) {
            eventsMap.set(t.id, {
                id: t.id,
                title: `${t.name} (${t.games?.title || 'Team Chat'})`,
                start_time: t.games?.start_time || new Date().toISOString(),
                event_type: 'Team Chat',
                status: t.games?.status || 'active',
                is_host: false
            });
        }
    });

    // 3. Fetch latest message per channel to get last_message_at and sort by activity
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
