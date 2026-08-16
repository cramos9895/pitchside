'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface MessengerNavButtonProps {
    userId: string;
}

export function MessengerNavButton({ userId }: MessengerNavButtonProps) {
    const pathname = usePathname();
    const isMessagesPage = pathname === '/messages' || pathname.startsWith('/messages');
    const [unreadCount, setUnreadCount] = useState(0);

    // Initial fetch of unread messages
    useEffect(() => {
        if (!userId) return;

        // If on the messages page, reset badge
        if (isMessagesPage) {
            setUnreadCount(0);
        }

        const fetchUnread = async () => {
            try {
                // Fetch direct message threads where the user has unread messages
                const { data: memberRows } = await supabase
                    .from('conversation_members')
                    .select('conversation_id, last_read_at')
                    .eq('user_id', userId);

                if (!memberRows || memberRows.length === 0) return;

                let count = 0;
                for (const member of memberRows) {
                    const { count: msgCount } = await supabase
                        .from('messages')
                        .select('id', { count: 'exact', head: true })
                        .eq('conversation_id', member.conversation_id)
                        .neq('user_id', userId)
                        .gt('created_at', member.last_read_at || '1970-01-01');

                    if (msgCount && msgCount > 0) {
                        count += msgCount;
                    }
                }

                if (!isMessagesPage) {
                    setUnreadCount(count);
                }
            } catch (err) {
                console.error('Error fetching unread messages count:', err);
            }
        };

        fetchUnread();

        // Realtime Subscription for incoming messages
        const channel = supabase
            .channel(`nav-messages-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                (payload: Record<string, any>) => {
                    const newMsg = payload.new;
                    // Only alert if the message was sent by someone else
                    if (newMsg && newMsg.user_id !== userId) {
                        if (!isMessagesPage) {
                            setUnreadCount((prev) => prev + 1);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, isMessagesPage]);

    return (
        <Link
            href="/messages"
            onClick={() => setUnreadCount(0)}
            className={cn(
                "relative flex items-center justify-center p-2 rounded-full transition-all border shadow-[0_0_15px_rgba(0,0,0,0.5)] group",
                isMessagesPage
                    ? "bg-pitch-accent/15 border-pitch-accent text-pitch-accent"
                    : "bg-white/5 border-white/10 hover:border-pitch-accent hover:text-pitch-accent text-white"
            )}
            title="Messenger Hub"
            aria-label="Open Messenger Hub"
        >
            <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />

            {/* Electric Volt Unread Badge */}
            {unreadCount > 0 && !isMessagesPage && (
                <span className="absolute -top-1 -right-1 bg-pitch-accent text-pitch-black text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse shadow-[0_0_8px_rgba(204,255,0,0.8)]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </Link>
    );
}
