import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendNotification } from '@/lib/email';
import { ChatNotification } from '@/emails/ChatNotification';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { gameId, messageId, content, isBroadcast, hasHostTag } = await request.json();

        if (!gameId || !messageId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Fetch Game Details
        const { data: game } = await supabase
            .from('games')
            .select('title, host_ids')
            .eq('id', gameId)
            .single();

        if (!game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        const senderProfile = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single();

        const senderName = senderProfile?.data?.full_name || senderProfile?.data?.email || 'A Participant';

        const gameUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pitchsidecf.com'}/games/${gameId}`;
        const emailsToSend = new Set<string>();

        // 2. Identify Recipients
        if (isBroadcast) {
            // Is Broadcast: Send to all Confirmed and Waitlisted players
            const { data: bookings } = await supabase
                .from('bookings')
                .select('user_id, profiles(email)')
                .eq('game_id', gameId)
                .neq('status', 'cancelled')
                .neq('roster_status', 'dropped');

            if (bookings) {
                for (const b of bookings) {
                    if (b.user_id !== user.id) { // Don't email the sender
                        const profilesData = b.profiles;
                        const profileArray = Array.isArray(profilesData) ? profilesData : [profilesData];
                        for (const p of profileArray) {
                            if (p && p.email) emailsToSend.add(p.email);
                        }
                    }
                }
            }
        } else if (hasHostTag) {
            // @host Tag: Send strictly to users in game.host_ids
            if (game.host_ids && game.host_ids.length > 0) {
                const { data: hosts } = await supabase
                    .from('profiles')
                    .select('email, id')
                    .in('id', game.host_ids);

                if (hosts) {
                    for (const h of hosts) {
                        if (h.id !== user.id && h.email) {
                            emailsToSend.add(h.email);
                        }
                    }
                }
            }
        }

        if (emailsToSend.size === 0) {
            return NextResponse.json({ success: true, message: 'No recipients' });
        }

        // 3. Send Emails
        const emailSubject = isBroadcast
            ? `📢 Announcement: ${game.title}`
            : `💬 New message in ${game.title} (@host)`;

        // In production, you might want to batch these or use Resend's batch API
        // For simplicity and to reuse our sendNotification wrapper, we iterate:
        const emailPromises = Array.from(emailsToSend).map(email =>
            sendNotification({
                to: email,
                subject: emailSubject,
                type: 'chat_alert',
                react: ChatNotification({
                    eventName: game.title,
                    senderName,
                    messageContent: content,
                    isBroadcast: !!isBroadcast,
                    gameUrl
                })
            })
        );

        await Promise.allSettled(emailPromises);

        return NextResponse.json({ success: true, sentCount: emailsToSend.size });

    } catch (err: any) {
        console.error('Chat Notification API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
