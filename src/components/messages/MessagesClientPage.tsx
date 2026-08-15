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
}

export interface DirectChatItem {
    id: string;
    title: string;
    other_user_id?: string;
    last_message?: string;
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

export function MessagesClientPage({ currentUser, initialEvents, initialDirects }: MessagesClientPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [eventsList, setEventsList] = useState<EventChatItem[]>(initialEvents);
    const [directsList, setDirectsList] = useState<DirectChatItem[]>(initialDirects);
    const [searchQuery, setSearchQuery] = useState('');
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);

    // Active Selection State
    // e.g. { type: 'event', id: '...' } or { type: 'direct', id: '...', title: '...' }
    const initialConvParam = searchParams.get('c');
    const initialGameParam = searchParams.get('game');

    const defaultSelection = useMemo(() => {
        if (initialConvParam) {
            const foundDirect = directsList.find((d) => d.id === initialConvParam);
            return {
                type: 'direct' as const,
                id: initialConvParam,
                title: foundDirect ? foundDirect.title : 'Direct Message'
            };
        }
        if (initialGameParam) {
            const foundEvent = eventsList.find((e) => e.id === initialGameParam);
            return {
                type: 'event' as const,
                id: initialGameParam,
                title: foundEvent ? foundEvent.title : 'Event Chat',
                is_host: foundEvent?.is_host
            };
        }
        if (eventsList.length > 0) {
            return {
                type: 'event' as const,
                id: eventsList[0].id,
                title: eventsList[0].title,
                is_host: eventsList[0].is_host
            };
        }
        if (directsList.length > 0) {
            return {
                type: 'direct' as const,
                id: directsList[0].id,
                title: directsList[0].title
            };
        }
        return null;
    }, [initialConvParam, initialGameParam, eventsList, directsList]);

    const [activeChat, setActiveChat] = useState<{
        type: 'event' | 'direct';
        id: string;
        title: string;
        is_host?: boolean;
    } | null>(defaultSelection);

    // Mobile view toggle (list vs chat)
    const [mobileShowChat, setMobileShowChat] = useState(false);

    // Filter channels and DMs
    const filteredEvents = useMemo(() => {
        if (!searchQuery.trim()) return eventsList;
        return eventsList.filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [eventsList, searchQuery]);

    const filteredDirects = useMemo(() => {
        if (!searchQuery.trim()) return directsList;
        return directsList.filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [directsList, searchQuery]);

    // Handle selecting a conversation
    const handleSelectChat = (chat: { type: 'event' | 'direct'; id: string; title: string; is_host?: boolean }) => {
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
            // Fetch the newly created thread details
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
                    title: data.title || 'Direct Message'
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
            <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Left Directory Panel (Sidebar) */}
                <div
                    className={cn(
                        "md:col-span-4 lg:col-span-4 bg-pitch-card border border-white/10 rounded-sm overflow-hidden flex flex-col h-[700px]",
                        mobileShowChat ? "hidden md:flex" : "flex"
                    )}
                >
                    {/* Search Bar */}
                    <div className="p-3 border-b border-white/10 bg-white/5">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search chats..."
                                className="w-full bg-black/60 border border-white/15 focus:border-pitch-accent rounded-sm pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Conversation List Scroll Area */}
                    <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                        {/* Section 1: Active Event Chats */}
                        <div>
                            <div className="px-4 py-2 bg-black/40 text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                    <Flame className="w-3 h-3 text-pitch-accent" /> Event Chats ({filteredEvents.length})
                                </span>
                            </div>

                            {filteredEvents.length === 0 ? (
                                <div className="px-4 py-4 text-center text-xs text-gray-500 italic">
                                    No active event chats.
                                </div>
                            ) : (
                                filteredEvents.map((evt) => {
                                    const isSelected = activeChat?.type === 'event' && activeChat.id === evt.id;
                                    const dateStr = evt.start_time
                                        ? new Date(evt.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })
                                        : '';

                                    return (
                                        <button
                                            key={evt.id}
                                            type="button"
                                            onClick={() =>
                                                handleSelectChat({
                                                    type: 'event',
                                                    id: evt.id,
                                                    title: evt.title,
                                                    is_host: evt.is_host
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
                                                    {dateStr && (
                                                        <span className="text-[10px] text-gray-500 font-bold uppercase shrink-0 ml-1">
                                                            {dateStr}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded-sm bg-white/10 text-gray-300">
                                                        {evt.event_type || 'Pickup'}
                                                    </span>
                                                    {evt.is_host && (
                                                        <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded-sm bg-pitch-accent text-pitch-black">
                                                            Host
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Section 2: Direct Messages (1-on-1) */}
                        <div>
                            <div className="px-4 py-2 bg-black/40 text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center justify-between">
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
                                filteredDirects.map((dm) => {
                                    const isSelected = activeChat?.type === 'direct' && activeChat.id === dm.id;

                                    return (
                                        <button
                                            key={dm.id}
                                            type="button"
                                            onClick={() =>
                                                handleSelectChat({
                                                    type: 'direct',
                                                    id: dm.id,
                                                    title: dm.title
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
                                                <p className={cn(
                                                    "text-xs font-bold truncate",
                                                    isSelected ? "text-pitch-accent" : "text-white"
                                                )}>
                                                    {dm.title}
                                                </p>
                                                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                                    Direct Conversation
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
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
                                title={activeChat.title}
                                className="h-full border-none rounded-none"
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                            <div className="p-4 bg-white/5 rounded-full text-pitch-accent border border-white/10 mb-4">
                                <MessageSquare className="w-8 h-8" />
                            </div>
                            <h3 className="font-heading text-lg font-bold italic uppercase text-white mb-1">
                                No Conversation Selected
                            </h3>
                            <p className="text-xs text-gray-400 max-w-sm mb-4">
                                Choose an event chat from the sidebar or click below to message a player directly.
                            </p>
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

            {/* New Message / Player Search Modal */}
            <NewConversationModal
                isOpen={isNewModalOpen}
                onClose={() => setIsNewModalOpen(false)}
                onConversationCreated={handleConversationCreated}
            />
        </div>
    );
}
