'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { MessageSquare, X, Megaphone, ChevronDown } from 'lucide-react';
import { ChatInterface, ChatPlayer } from '@/components/ChatInterface';
import { cn } from '@/lib/utils';

interface AdminChatDrawerProps {
    gameId: string;
    currentUserId: string;
    players?: ChatPlayer[];
    gameTitle?: string;
}

export function AdminChatDrawer({
    gameId,
    currentUserId,
    players,
    gameTitle
}: AdminChatDrawerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Subscribe to new messages to track unread messages while the drawer is closed
    useEffect(() => {
        const channel = supabase
            .channel(`admin-chat-drawer-count-${gameId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `event_id=eq.${gameId}`
                },
                (payload: Record<string, any>) => {
                    // Only count unread if the drawer is closed and the message is from someone else
                    if (!isOpen && payload.new.user_id !== currentUserId) {
                        setUnreadCount((prev) => prev + 1);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [gameId, isOpen, currentUserId]);

    // Reset unread count when drawer opens
    const handleOpenDrawer = () => {
        setIsOpen(true);
        setUnreadCount(0);
    };

    const handleCloseDrawer = () => {
        setIsOpen(false);
    };

    return (
        <>
            {/* Floating Trigger Pill (Fixed Bottom Right) */}
            <div className="fixed bottom-6 right-6 z-40 print:hidden">
                <button
                    type="button"
                    onClick={isOpen ? handleCloseDrawer : handleOpenDrawer}
                    aria-label="Toggle Live Event Chat"
                    className={cn(
                        "flex items-center gap-2.5 px-4 py-3 rounded-full font-heading font-black italic uppercase tracking-wider text-xs shadow-2xl transition-all border",
                        isOpen
                            ? "bg-white/10 text-white border-white/20 hover:bg-white/20"
                            : unreadCount > 0
                            ? "bg-pitch-accent text-pitch-black border-pitch-accent ring-4 ring-pitch-accent/30 animate-pulse scale-105"
                            : "bg-pitch-card text-white border-pitch-accent/50 hover:border-pitch-accent hover:bg-pitch-card/90"
                    )}
                >
                    <MessageSquare className="w-4 h-4" />
                    <span>{isOpen ? 'Close Chat' : 'Live Comms'}</span>

                    {unreadCount > 0 && !isOpen && (
                        <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ml-1">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Backdrop for Mobile / Focus */}
            {isOpen && (
                <div
                    onClick={handleCloseDrawer}
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity animate-in fade-in"
                />
            )}

            {/* Slide-out Overlay: Bottom Sheet on Mobile, Floating Sidebar on Desktop */}
            {isOpen && (
                <div
                    className={cn(
                        "fixed z-50 bg-pitch-card border border-white/15 shadow-2xl overflow-hidden flex flex-col",
                        // Mobile: Bottom Sheet
                        "inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl animate-in slide-in-from-bottom duration-300",
                        // Desktop: Anchored Bottom-Right Floating Card
                        "md:inset-x-auto md:bottom-20 md:right-6 md:w-[440px] md:h-[650px] md:rounded-xl md:border-pitch-accent/30 md:animate-in md:slide-in-from-bottom-5"
                    )}
                >
                    {/* Drawer Header Bar */}
                    <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-pitch-accent animate-pulse" />
                            <h4 className="font-heading font-black italic uppercase text-sm text-white tracking-wider">
                                Live Host Comms
                            </h4>
                            {gameTitle && (
                                <span className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[140px]">
                                    ({gameTitle})
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="bg-pitch-accent/20 text-pitch-accent border border-pitch-accent/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-sm">
                                Admin Mode
                            </span>
                            <button
                                type="button"
                                onClick={handleCloseDrawer}
                                className="p-1 rounded-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                title="Close Comms"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Chat Content Body */}
                    <div className="flex-1 overflow-hidden">
                        <ChatInterface
                            gameId={gameId}
                            currentUserId={currentUserId}
                            isParticipant={true}
                            isHost={true}
                            players={players}
                            className="h-full border-none rounded-none"
                        />
                    </div>
                </div>
            )}
        </>
    );
}
