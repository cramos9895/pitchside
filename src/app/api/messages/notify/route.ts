// 🏗️ Architecture: [[ChatInterface.md]]

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendNotification } from '@/lib/email';
import { isRateLimited } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // --- SECURITY: RATE LIMITING ---
        // Messaging is an authenticated action, so we limit by User ID
        // 10 messages per minute to prevent mass-spamming email notifications
        const isLimited = await isRateLimited(user.id, 'api:messages:notify', 10, 60);
        if (isLimited) {
            return NextResponse.json({ 
                error: "Messaging limit exceeded. Please wait a moment before sending more notifications." 
            }, { status: 429 });
        }
        // -------------------------------

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
                data: {
                    userName: 'Player', // Static or fetch recipient name if possible
                    senderName,
                    gameTitle: game.title,
                    messageContent: content,
                    gameUrl
                }
            })
        );

        await Promise.allSettled(emailPromises);

        return NextResponse.json({ success: true, sentCount: emailsToSend.size });

    } catch (err: any) {
        console.error('Chat Notification API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
