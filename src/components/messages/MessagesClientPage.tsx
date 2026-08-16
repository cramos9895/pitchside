'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ChatInterface } from '@/components/ChatInterface';
import { NewConversationModal } from './NewConversationModal';
import { 
    MessageSquare, 
    Search, 
    Plus, 
    Calendar, 
    User as UserIcon, 
    Users, 
    ChevronLeft, 
    ChevronDown,
    ChevronUp,
    Sparkles, 
    Trophy, 
    Flame,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';

export interface EventChatItem {
    id: string;
    title: string;
    start_time: string;
    event_type?: string;
    status: string;
    is_host?: boolean;
    last_message?: string;
    last_message_at?: string | null;
}

export interface DirectChatItem {
    id: string;
    title: string;
    other_user_id?: string;
    last_message?: string;
    last_message_at?: string | null;
    updated_at: string;
}

interface MessagesClientPageProps {
    currentUser: {
        id: string;
        email?: string;
        first_name?: string;
        last_name?: string;
    };
    initialEvents: EventChatItem[];
    initialDirects: DirectChatItem[];
}

function formatChatSidebarTime(dateString?: string | null): string {
    if (!dateString) return '';
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    return past.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function MessagesClientPage({ currentUser, initialEvents, initialDirects }: MessagesClientPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [eventsList, setEventsList] = useState<EventChatItem[]>(initialEvents);
    const [directsList, setDirectsList] = useState<DirectChatItem[]>(initialDirects);
    const [searchQuery, setSearchQuery] = useState('');
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);

    // Accordion state (limit to 4 items initially per section)
    const [eventsExpanded, setEventsExpanded] = useState(false);
    const [directsExpanded, setDirectsExpanded] = useState(false);

    // Active Selection State
    const initialConvParam = searchParams.get('c');
    const initialGameParam = searchParams.get('game');

    const defaultSelection = useMemo(() => {
        if (initialConvParam) {
            const foundDirect = directsList.find((d) => d.id === initialConvParam);
            return {
                type: 'direct' as const,
                id: initialConvParam,
                title: foundDirect ? foundDirect.title : 'Direct Message',
                event_type: 'Direct Message'
            };
        }
        if (initialGameParam) {
            const foundEvent = eventsList.find((e) => e.id === initialGameParam);
            return {
                type: 'event' as const,
                id: initialGameParam,
                title: foundEvent ? foundEvent.title : 'Event Chat',
                is_host: foundEvent?.is_host,
                event_type: foundEvent?.event_type || 'Pickup'
            };
        }
        if (eventsList.length > 0) {
            return {
                type: 'event' as const,
                id: eventsList[0].id,
                title: eventsList[0].title,
                is_host: eventsList[0].is_host,
                event_type: eventsList[0].event_type || 'Pickup'
            };
        }
        if (directsList.length > 0) {
            return {
                type: 'direct' as const,
                id: directsList[0].id,
                title: directsList[0].title,
                event_type: 'Direct Message'
            };
        }
        return null;
    }, [initialConvParam, initialGameParam, eventsList, directsList]);

    const [activeChat, setActiveChat] = useState<{
        type: 'event' | 'direct';
        id: string;
        title: string;
        is_host?: boolean;
        event_type?: string;
    } | null>(defaultSelection);

    // Mobile view toggle (list vs chat)
    const [mobileShowChat, setMobileShowChat] = useState(false);

    // Realtime listener for sidebar message previews & live re-ordering
    useEffect(() => {
        const channel = supabase
            .channel(`messages-sidebar-sync-${currentUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                (payload: Record<string, any>) => {
                    const newMsg = payload.new;
                    if (!newMsg) return;

                    // 1. If it belongs to an event or team channel
                    if (newMsg.event_id) {
                        setEventsList((prev) => {
                            const index = prev.findIndex((e) => e.id === newMsg.event_id);
                            if (index !== -1) {
                                const target = {
                                    ...prev[index],
                                    last_message: newMsg.content,
                                    last_message_at: newMsg.created_at
                                };
                                const updated = [...prev];
                                updated.splice(index, 1);
                                return [target, ...updated];
                            }
                            return prev;
                        });
                    }

                    // 2. If it belongs to a direct message thread
                    if (newMsg.conversation_id) {
                        setDirectsList((prev) => {
                            const index = prev.findIndex((d) => d.id === newMsg.conversation_id);
                            if (index !== -1) {
                                const target = {
                                    ...prev[index],
                                    last_message: newMsg.content,
                                    last_message_at: newMsg.created_at
                                };
                                const updated = [...prev];
                                updated.splice(index, 1);
                                return [target, ...updated];
                            }
                            return prev;
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'conversation_members',
                    filter: `user_id=eq.${currentUser.id}`
                },
                async (payload: Record<string, any>) => {
                    const newMember = payload.new;
                    if (newMember && newMember.conversation_id) {
                        // Fetch the new thread
                        const { data: threadData } = await supabase
                            .from('conversation_threads')
                            .select('id, title, updated_at')
                            .eq('id', newMember.conversation_id)
                            .single();

                        if (threadData) {
                            setDirectsList((prev) => {
                                if (prev.some((d) => d.id === threadData.id)) return prev;
                                return [
                                    {
                                        id: threadData.id,
                                        title: threadData.title || 'Direct Message',
                                        updated_at: threadData.updated_at
                                    },
                                    ...prev
                                ];
                            });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser.id]);

    // Filter channels and DMs
    const filteredEvents = useMemo(() => {
        if (!searchQuery.trim()) return eventsList;
        return eventsList.filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [eventsList, searchQuery]);

    const filteredDirects = useMemo(() => {
        if (!searchQuery.trim()) return directsList;
        return directsList.filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [directsList, searchQuery]);

    // Accordion slicing (show top 4 when collapsed)
    const visibleEvents = eventsExpanded || searchQuery.trim().length > 0
        ? filteredEvents 
        : filteredEvents.slice(0, 4);

    const visibleDirects = directsExpanded || searchQuery.trim().length > 0
        ? filteredDirects 
        : filteredDirects.slice(0, 4);

    // Handle selecting a conversation
    const handleSelectChat = (chat: {
        type: 'event' | 'direct';
        id: string;
        title: string;
        is_host?: boolean;
        event_type?: string;
    }) => {
        setActiveChat(chat);
        setMobileShowChat(true);

        if (chat.type === 'direct') {
            router.replace(`/messages?c=${chat.id}`, { scroll: false });
        } else {
            router.replace(`/messages?game=${chat.id}`, { scroll: false });
        }
    };

    // When a new conversation is created from modal
    const handleConversationCreated = async (newConvId: string) => {
        try {
            const { data } = await supabase
                .from('conversation_threads')
                .select('id, title, updated_at')
                .eq('id', newConvId)
                .single();

            if (data) {
                const newDirectItem: DirectChatItem = {
                    id: data.id,
                    title: data.title || 'Direct Message',
                    updated_at: data.updated_at
                };

                setDirectsList((prev) => [newDirectItem, ...prev.filter((d) => d.id !== newConvId)]);
                handleSelectChat({
                    type: 'direct',
                    id: data.id,
                    title: data.title || 'Direct Message',
                    event_type: 'Direct Message'
                });
            }
        } catch (err) {
            console.error('Error refreshing new conversation:', err);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] bg-pitch-black flex flex-col">
            {/* Header Title Bar */}
            <div className="bg-[#171717] border-b border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-pitch-accent/10 border border-pitch-accent/30 rounded-sm text-pitch-accent">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="font-heading text-xl sm:text-2xl font-black italic uppercase tracking-wider text-white">
                            PitchSide Messenger
                        </h1>
                        <p className="text-xs text-gray-400">
                            Central hub for event chats, teammates, and direct messages
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setIsNewModalOpen(true)}
                    className="bg-pitch-accent hover:bg-white text-pitch-black px-3 sm:px-4 py-2 rounded-sm text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-lg"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">New Message</span>
                </button>
            </div>

            {/* Main Split-Pane Workspace */}
            <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full items-start">
                    
                    {/* Left Conversations Sidebar */}
                    <div
                        className={cn(
                            "md:col-span-4 lg:col-span-4 bg-pitch-card border border-white/10 rounded-sm flex flex-col overflow-hidden h-[700px]",
                            mobileShowChat ? "hidden md:flex" : "flex"
                        )}
                    >
                        {/* Search Channels Bar */}
                        <div className="p-3 border-b border-white/10 bg-white/5">
                            <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search chats or teammates..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-pitch-black border border-white/10 text-white text-xs rounded-sm focus:outline-none focus:border-pitch-accent"
                                />
                            </div>
                        </div>

                        {/* Channels List Stream */}
                        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                            
                            {/* Section 1: Event Chats */}
                            <div>
                                <div className="px-4 py-2.5 bg-black/40 text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-pitch-accent" /> Event Chats ({filteredEvents.length})
                                    </span>
                                </div>

                                {filteredEvents.length === 0 ? (
                                    <div className="px-4 py-4 text-center text-xs text-gray-500 italic">
                                        No active event chats.
                                    </div>
                                ) : (
                                    <>
                                        {visibleEvents.map((evt) => {
                                            const isSelected = activeChat?.type === 'event' && activeChat.id === evt.id;
                                            const timeDisplay = formatChatSidebarTime(evt.last_message_at || evt.start_time);

                                            return (
                                                <button
                                                    key={evt.id}
                                                    type="button"
                                                    onClick={() =>
                                                        handleSelectChat({
                                                            type: 'event',
                                                            id: evt.id,
                                                            title: evt.title,
                                                            is_host: evt.is_host,
                                                            event_type: evt.event_type
                                                        })
                                                    }
                                                    className={cn(
                                                        "w-full px-4 py-3 text-left transition-all flex items-start gap-3 group relative border-l-2",
                                                        isSelected
                                                            ? "bg-pitch-accent/10 border-pitch-accent"
                                                            : "hover:bg-white/5 border-transparent"
                                                    )}
                                                >
                                                    <div className="p-2 rounded-sm bg-white/5 text-gray-300 group-hover:text-pitch-accent transition-colors shrink-0 mt-0.5">
                                                        <Calendar className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <p className={cn(
                                                                "text-xs font-bold truncate",
                                                                isSelected ? "text-pitch-accent" : "text-white"
                                                            )}>
                                                                {evt.title}
                                                            </p>
                                                            {timeDisplay && (
                                                                <span className="text-[10px] text-gray-500 font-bold uppercase shrink-0 ml-1">
                                                                    {timeDisplay}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Badges Row */}
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded-sm bg-white/10 text-gray-300 border border-white/10">
                                                                {evt.event_type || 'Pickup'}
                                                            </span>
                                                            {evt.is_host && (
                                                                <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded-sm bg-pitch-accent text-pitch-black">
                                                                    Host
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Last Message Snippet */}
                                                        <p className="text-[11px] text-gray-400 truncate mt-1">
                                                            {evt.last_message || <span className="italic text-gray-600">No messages yet</span>}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}

                                        {/* Accordion Expand / Collapse Button for Events */}
                                        {filteredEvents.length > 4 && searchQuery.trim().length === 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setEventsExpanded(!eventsExpanded)}
                                                className="w-full py-2 px-4 text-[10px] font-black uppercase tracking-wider text-pitch-accent hover:text-white bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5 border-t border-white/5"
                                            >
                                                {eventsExpanded ? (
                                                    <>
                                                        <ChevronUp className="w-3.5 h-3.5" /> Show less
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="w-3.5 h-3.5" /> Show {filteredEvents.length - 4} more event chats
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Section 2: Direct Messages (1-on-1) */}
                            <div>
                                <div className="px-4 py-2.5 bg-black/40 text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                        <UserIcon className="w-3 h-3 text-pitch-accent" /> Direct Messages ({filteredDirects.length})
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsNewModalOpen(true)}
                                        className="text-pitch-accent hover:underline text-[10px] font-bold lowercase"
                                    >
                                        + new
                                    </button>
                                </div>

                                {filteredDirects.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-xs text-gray-500 italic">
                                        No direct messages yet. Click &ldquo;+ New&rdquo; to start a chat!
                                    </div>
                                ) : (
                                    <>
                                        {visibleDirects.map((dm) => {
                                            const isSelected = activeChat?.type === 'direct' && activeChat.id === dm.id;
                                            const timeDisplay = formatChatSidebarTime(dm.last_message_at || dm.updated_at);

                                            return (
                                                <button
                                                    key={dm.id}
                                                    type="button"
                                                    onClick={() =>
                                                        handleSelectChat({
                                                            type: 'direct',
                                                            id: dm.id,
                                                            title: dm.title,
                                                            event_type: 'Direct Message'
                                                        })
                                                    }
                                                    className={cn(
                                                        "w-full px-4 py-3 text-left transition-all flex items-start gap-3 group relative border-l-2",
                                                        isSelected
                                                            ? "bg-pitch-accent/10 border-pitch-accent"
                                                            : "hover:bg-white/5 border-transparent"
                                                    )}
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 mt-0.5 border border-white/10 group-hover:border-pitch-accent group-hover:text-pitch-accent transition-colors">
                                                        <UserIcon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <p className={cn(
                                                                "text-xs font-bold truncate",
                                                                isSelected ? "text-pitch-accent" : "text-white"
                                                            )}>
                                                                {dm.title}
                                                            </p>
                                                            {timeDisplay && (
                                                                <span className="text-[10px] text-gray-500 font-bold uppercase shrink-0 ml-1">
                                                                    {timeDisplay}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Badges Row */}
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded-sm bg-white/10 text-gray-300 border border-white/10">
                                                                Direct
                                                            </span>
                                                        </div>

                                                        {/* Message Snippet */}
                                                        <p className="text-[11px] text-gray-400 truncate mt-1">
                                                            {dm.last_message || <span className="italic text-gray-600">No messages yet</span>}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}

                                        {/* Accordion Expand / Collapse Button for DMs */}
                                        {filteredDirects.length > 4 && searchQuery.trim().length === 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setDirectsExpanded(!directsExpanded)}
                                                className="w-full py-2 px-4 text-[10px] font-black uppercase tracking-wider text-pitch-accent hover:text-white bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5 border-t border-white/5"
                                            >
                                                {directsExpanded ? (
                                                    <>
                                                        <ChevronUp className="w-3.5 h-3.5" /> Show less
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="w-3.5 h-3.5" /> Show {filteredDirects.length - 4} more direct chats
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Active Chat Stream Panel */}
                    <div
                        className={cn(
                            "md:col-span-8 lg:col-span-8 bg-pitch-card border border-white/10 rounded-sm overflow-hidden flex flex-col h-[700px]",
                            mobileShowChat ? "flex" : "hidden md:flex"
                        )}
                    >
                        {activeChat ? (
                            <div className="flex flex-col h-full">
                                {/* Mobile Back Button Bar */}
                                <div className="md:hidden bg-white/5 px-4 py-2 border-b border-white/10 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setMobileShowChat(false)}
                                        className="flex items-center gap-1 text-xs font-bold uppercase text-pitch-accent hover:text-white transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> All Conversations
                                    </button>
                                </div>

                                {/* Embedded Chat Interface */}
                                <ChatInterface
                                    key={`${activeChat.type}-${activeChat.id}`}
                                    gameId={activeChat.type === 'event' ? activeChat.id : undefined}
                                    conversationId={activeChat.type === 'direct' ? activeChat.id : undefined}
                                    currentUserId={currentUser.id}
                                    isParticipant={true}
                                    isHost={activeChat.is_host || false}
                                    eventType={activeChat.event_type}
                                    title={activeChat.title}
                                    className="h-full border-none rounded-none"
                                />
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                <div className="p-4 bg-white/5 rounded-full text-pitch-accent border border-white/10 mb-4">
                                    <MessageSquare className="w-8 h-8" />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsNewModalOpen(true)}
                                    className="bg-pitch-accent hover:bg-white text-pitch-black px-4 py-2 rounded-sm text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5"
                                >
                                    <Plus className="w-4 h-4" /> Start Direct Message
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* + New Conversation Modal */}
            <NewConversationModal
                isOpen={isNewModalOpen}
                onClose={() => setIsNewModalOpen(false)}
                onConversationCreated={handleConversationCreated}
            />
        </div>
    );
}
