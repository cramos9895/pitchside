'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Bell, Check, ExternalLink, MessageSquare, ShieldAlert, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export interface NotificationItem {
    id: string;
    message: string;
    type: string | null;
    is_read: boolean;
    link: string | null;
    created_at: string;
}

interface NotificationBellProps {
    userId: string;
}

// Format relative time helper (plain English)
function formatRelativeTime(dateString: string): string {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return past.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function NotificationBell({ userId }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Fetch initial notifications
    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('id, message, type, is_read, link, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(25);

            if (data) {
                setNotifications(data as NotificationItem[]);
                const unread = data.filter((n) => !n.is_read).length;
                setUnreadCount(unread);
            }
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!userId) return;

        fetchNotifications();

        // Realtime Subscription for new notifications or status updates
        const channel = supabase
            .channel(`user-notifications-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload: Record<string, any>) => {
                    const newNotif = payload.new as NotificationItem;
                    setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
                    if (!newNotif.is_read) {
                        setUnreadCount((prev) => prev + 1);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload: Record<string, any>) => {
                    const updated = payload.new as NotificationItem;
                    setNotifications((prev) =>
                        prev.map((n) => (n.id === updated.id ? updated : n))
                    );
                    // Re-calculate unread
                    setNotifications((prev) => {
                        const count = prev.filter((n) => !n.is_read).length;
                        setUnreadCount(count);
                        return prev;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Mark single notification as read
    const handleMarkAsRead = async (notifId: string) => {
        // Optimistic UI update
        setNotifications((prev) =>
            prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notifId);
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    // Mark all notifications as read
    const handleMarkAllAsRead = async () => {
        // Optimistic UI update
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);

        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    };

    // Handle clicking a notification item
    const handleNotificationClick = async (notif: NotificationItem) => {
        if (!notif.is_read) {
            handleMarkAsRead(notif.id);
        }
        setIsOpen(false);

        if (notif.link) {
            router.push(notif.link);
        } else if (notif.type === 'chat_mention' || notif.type === 'chat_alert') {
            // Fallback for legacy notifications created before link was populated
            router.push('/dashboard/schedule');
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={cn(
                    "relative flex items-center justify-center p-2 rounded-full transition-all border",
                    isOpen
                        ? "bg-white/10 border-pitch-accent text-pitch-accent"
                        : "bg-white/5 border-white/10 hover:border-pitch-accent hover:text-pitch-accent text-white"
                )}
                title="Notifications"
                aria-label="View notifications"
            >
                <Bell className="w-4 h-4" />

                {/* Electric Volt Unread Count Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-pitch-accent text-pitch-black text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse shadow-[0_0_8px_rgba(204,255,0,0.6)]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Notification Tray */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-pitch-card border border-white/15 rounded-sm shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h4 className="font-heading font-black italic uppercase tracking-wider text-sm text-white">
                                Notifications
                            </h4>
                            {unreadCount > 0 && (
                                <span className="bg-pitch-accent/20 text-pitch-accent border border-pitch-accent/40 text-[10px] font-black px-1.5 py-0.5 rounded-sm">
                                    {unreadCount} New
                                </span>
                            )}
                        </div>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={handleMarkAllAsRead}
                                className="text-[10px] font-black uppercase text-gray-400 hover:text-pitch-accent transition-colors flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" /> Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-white/5">
                        {loading ? (
                            <div className="py-8 text-center text-xs uppercase font-bold text-gray-400">
                                Loading alerts...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-10 text-center text-sm text-gray-400 italic">
                                No notifications yet.
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                const isChat = notif.type === 'chat_mention' || notif.type === 'chat_alert';

                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={cn(
                                            "p-3.5 flex items-start gap-3 transition-colors cursor-pointer group",
                                            notif.is_read
                                                ? "hover:bg-white/5 opacity-70 hover:opacity-100"
                                                : "bg-pitch-accent/5 hover:bg-pitch-accent/10 border-l-2 border-pitch-accent"
                                        )}
                                    >
                                        {/* Icon */}
                                        <div
                                            className={cn(
                                                "p-2 rounded-full shrink-0 mt-0.5",
                                                isChat
                                                    ? "bg-pitch-accent/20 text-pitch-accent"
                                                    : "bg-white/10 text-gray-300"
                                            )}
                                        >
                                            {isChat ? <MessageSquare className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className={cn(
                                                    "text-xs leading-relaxed break-words",
                                                    notif.is_read ? "text-gray-300" : "text-white font-medium"
                                                )}
                                            >
                                                {notif.message}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-gray-500 font-bold uppercase">
                                                    {formatRelativeTime(notif.created_at)}
                                                </span>
                                                {notif.link && (
                                                    <span className="text-[10px] text-pitch-accent font-bold uppercase flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        View <ExternalLink className="w-2.5 h-2.5" />
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Unread indicator dot */}
                                        {!notif.is_read && (
                                            <div className="w-2 h-2 rounded-full bg-pitch-accent shrink-0 mt-1.5 shadow-[0_0_6px_rgba(204,255,0,0.8)]" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
