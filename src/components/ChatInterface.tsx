'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Send, User as UserIcon, Loader2, Megaphone, Smile, AtSign, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Standard fixed sports & social emoji set
const FIXED_EMOJIS = ['👍', '⚽', '🔥', '❤️', '😂', '👏'] as const;

export interface ChatPlayer {
    id: string;
    name: string;
    email?: string;
    role?: 'host' | 'player' | 'captain' | 'admin';
}

interface Message {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    is_broadcast?: boolean;
    reactions?: Record<string, string[]>; // emoji -> array of user_ids
    mentioned_user_ids?: string[];
    profiles: {
        first_name: string;
        last_name: string;
        email: string;
    } | null;
}

interface ChatInterfaceProps {
    gameId: string;
    currentUserId: string;
    isParticipant: boolean;
    isHost?: boolean;
    players?: ChatPlayer[];
    className?: string;
}

export function ChatInterface({ 
    gameId, 
    currentUserId, 
    isParticipant, 
    isHost,
    players: initialPlayers,
    className
}: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isBroadcast, setIsBroadcast] = useState(false);
    const [sendEmailAlert, setSendEmailAlert] = useState(false);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [playersList, setPlayersList] = useState<ChatPlayer[]>(initialPlayers || []);
    
    // Reaction menu popover state
    const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);

    // Mentions autocomplete state
    const [mentionSearch, setMentionSearch] = useState<string | null>(null);
    const [mentionCursorIndex, setMentionCursorIndex] = useState<number | null>(null);
    const [selectedMentionIndex, setSelectedMentionIndex] = useState<number>(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const prevMessagesLengthRef = useRef<number>(0);

    // Auto-scroll to bottom ONLY on initial load or when new messages arrive (prevents auto-scroll on reactions)
    useEffect(() => {
        if (scrollRef.current) {
            const isInitialLoad = prevMessagesLengthRef.current === 0 && messages.length > 0;
            const hasNewMessages = messages.length > prevMessagesLengthRef.current;

            if (isInitialLoad || hasNewMessages) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages]);

    // Fetch registered players if not provided by parent component
    useEffect(() => {
        if (initialPlayers && initialPlayers.length > 0) {
            setPlayersList(initialPlayers);
            return;
        }

        const fetchPlayers = async () => {
            try {
                const { data: bookingsData } = await supabase
                    .from('bookings')
                    .select('user_id, profiles(id, first_name, last_name, email)')
                    .eq('game_id', gameId)
                    .neq('status', 'cancelled');

                if (bookingsData) {
                    const mapped: ChatPlayer[] = [];
                    bookingsData.forEach((b: any) => {
                        if (b.user_id && b.profiles) {
                            const p = b.profiles;
                            const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Player';
                            mapped.push({
                                id: b.user_id,
                                name: fullName,
                                email: p.email
                            });
                        }
                    });
                    setPlayersList(mapped);
                }
            } catch (err) {
                console.error('Error fetching chat players for autocomplete:', err);
            }
        };

        fetchPlayers();
    }, [gameId, initialPlayers]);

    // Fetch Initial Messages
    useEffect(() => {
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('id, content, created_at, user_id, is_broadcast, reactions, mentioned_user_ids, profiles(first_name, last_name, email)')
                .eq('event_id', gameId)
                .order('created_at', { ascending: true });

            if (data) {
                // @ts-expect-error - Residual typing mismatch from extended schema mapping
                setMessages(data as unknown);
            }
            setLoading(false);
        };

        fetchMessages();

        // Realtime Subscription (INSERT and UPDATE for live messages and reactions)
        const channel = supabase
            .channel(`game-chat-${gameId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `event_id=eq.${gameId}`
                },
                async (payload: Record<string, any>) => {
                    // Fetch profile for the new message
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('first_name, last_name, email')
                        .eq('id', payload.new.user_id)
                        .single();

                    const newMsg: Message = {
                        id: payload.new.id,
                        content: payload.new.content,
                        created_at: payload.new.created_at,
                        user_id: payload.new.user_id,
                        is_broadcast: payload.new.is_broadcast,
                        reactions: payload.new.reactions || {},
                        mentioned_user_ids: payload.new.mentioned_user_ids || [],
                        profiles: profileData
                    };

                    setMessages((prev) => {
                        if (prev.some((m) => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `event_id=eq.${gameId}`
                },
                (payload: Record<string, any>) => {
                    // Update reaction or content changes in real-time
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === payload.new.id
                                ? {
                                      ...msg,
                                      content: payload.new.content,
                                      reactions: payload.new.reactions || {},
                                      mentioned_user_ids: payload.new.mentioned_user_ids || []
                                  }
                                : msg
                        )
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [gameId]);

    // Filter autocomplete mention candidates
    const mentionCandidates = useMemo(() => {
        if (mentionSearch === null) return [];

        const searchLower = mentionSearch.toLowerCase();
        const baseOptions: { id: string; name: string; tag: string; subtitle: string }[] = [
            { id: 'host', name: 'Host', tag: '@host', subtitle: 'Alert game organizers' },
            { id: 'all', name: 'All Players', tag: '@all', subtitle: 'Notify everyone in game' },
        ];

        const playerOptions = playersList
            .filter((p) => p.id !== currentUserId)
            .map((p) => ({
                id: p.id,
                name: p.name,
                tag: `@${p.name.replace(/\s+/g, '')}`,
                subtitle: p.email || 'Registered Player'
            }));

        const allAvailable = [...baseOptions, ...playerOptions];
        return allAvailable.filter(
            (item) =>
                item.name.toLowerCase().includes(searchLower) ||
                item.tag.toLowerCase().includes(searchLower)
        );
    }, [mentionSearch, playersList, currentUserId]);

    // Handle typing and detect `@` for autocomplete
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const cursor = e.target.selectionStart || 0;
        setNewMessage(val);

        // Check if cursor is directly after an '@' tag query
        const textBeforeCursor = val.slice(0, cursor);
        const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);

        if (match) {
            setMentionSearch(match[1]);
            setMentionCursorIndex(cursor - match[1].length - 1);
            setSelectedMentionIndex(0);
        } else {
            setMentionSearch(null);
            setMentionCursorIndex(null);
        }
    };

    // Insert selected mention into input
    const applyMention = (tag: string) => {
        if (mentionCursorIndex === null || inputRef.current === null) return;

        const cursor = inputRef.current.selectionStart || 0;
        const textBefore = newMessage.slice(0, mentionCursorIndex);
        const textAfter = newMessage.slice(cursor);
        const inserted = `${textBefore}${tag} ${textAfter}`;

        setNewMessage(inserted);
        setMentionSearch(null);
        setMentionCursorIndex(null);

        // Refocus and place cursor after inserted mention
        setTimeout(() => {
            if (inputRef.current) {
                const nextPos = textBefore.length + tag.length + 1;
                inputRef.current.focus();
                inputRef.current.setSelectionRange(nextPos, nextPos);
            }
        }, 10);
    };

    // Handle keyboard navigation for mentions dropdown
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (mentionSearch !== null && mentionCandidates.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedMentionIndex((prev) => (prev + 1) % mentionCandidates.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedMentionIndex((prev) => (prev - 1 + mentionCandidates.length) % mentionCandidates.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const selected = mentionCandidates[selectedMentionIndex] || mentionCandidates[0];
                if (selected) {
                    applyMention(selected.tag);
                }
                return;
            }
            if (e.key === 'Escape') {
                setMentionSearch(null);
                return;
            }
        }
    };

    // Toggle reaction on a message
    const handleToggleReaction = async (messageId: string, emoji: string) => {
        if (!isParticipant) return;

        // 1. Optimistic UI update
        setMessages((prev) =>
            prev.map((msg) => {
                if (msg.id !== messageId) return msg;

                const currentReactions = { ...(msg.reactions || {}) };
                const currentUsers = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
                const userIndex = currentUsers.indexOf(currentUserId);

                if (userIndex >= 0) {
                    currentUsers.splice(userIndex, 1);
                } else {
                    currentUsers.push(currentUserId);
                }

                if (currentUsers.length === 0) {
                    delete currentReactions[emoji];
                } else {
                    currentReactions[emoji] = currentUsers;
                }

                return {
                    ...msg,
                    reactions: currentReactions
                };
            })
        );

        setActiveReactionMsgId(null);

        // 2. Call Supabase atomic RPC
        try {
            const { error } = await supabase.rpc('toggle_message_reaction', {
                p_message_id: messageId,
                p_emoji: emoji
            });

            if (error) {
                console.error('Error toggling reaction:', error);
            }
        } catch (err) {
            console.error('Error invoking toggle_message_reaction:', err);
        }
    };

    // Send Message
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            const content = newMessage.trim();

            // Detect mentioned player user IDs
            const mentionedIds: string[] = [];
            playersList.forEach((player) => {
                const cleanName = player.name.replace(/\s+/g, '').toLowerCase();
                if (content.toLowerCase().includes(`@${cleanName}`)) {
                    if (!mentionedIds.includes(player.id)) {
                        mentionedIds.push(player.id);
                    }
                }
            });

            // Insert into Supabase messages table
            const { error, data: insertedMessage } = await supabase
                .from('messages')
                .insert({
                    event_id: gameId,
                    user_id: currentUserId,
                    content: content,
                    is_broadcast: isHost ? isBroadcast : false,
                    mentioned_user_ids: mentionedIds,
                    reactions: {}
                })
                .select()
                .single();

            if (error) throw error;

            setNewMessage('');
            setIsBroadcast(false);
            setMentionSearch(null);

            // 1. Dispatch In-App Notifications for mentioned players
            if (mentionedIds.length > 0) {
                const notificationsToInsert = mentionedIds
                    .filter((uid) => uid !== currentUserId)
                    .map((uid) => ({
                        user_id: uid,
                        message: `You were tagged in pickup chat: "${content.substring(0, 75)}${content.length > 75 ? '...' : ''}"`,
                        type: 'chat_mention',
                        link: `/games/${gameId}?tab=chat`,
                        is_read: false
                    }));

                if (notificationsToInsert.length > 0) {
                    supabase
                        .from('notifications')
                        .insert(notificationsToInsert)
                        .then(({ error: notifErr }) => {
                            if (notifErr) console.warn('In-app notification insert note:', notifErr);
                        });
                }
            }

            // 2. Trigger notification API for Host tags, Broadcasts, and dormant email alerts
            const hasHostTag = content.toLowerCase().includes('@host');
            if ((isHost && isBroadcast && sendEmailAlert) || hasHostTag || mentionedIds.length > 0) {
                fetch('/api/messages/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gameId,
                        messageId: insertedMessage.id,
                        content,
                        isBroadcast: isHost && isBroadcast && sendEmailAlert,
                        hasHostTag,
                        mentionedUserIds: mentionedIds
                    })
                }).catch((err) => console.error('Error triggering notification API:', err));
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    // Helper to highlight @mentions in message text
    const renderFormattedContent = (content: string) => {
        // Regex matches mentions like @host, @all, or @PlayerName
        const parts = content.split(/(@[a-zA-Z0-9_]+)/g);

        return parts.map((part, idx) => {
            if (part.startsWith('@')) {
                const isHostMention = part.toLowerCase() === '@host';
                const isAllMention = part.toLowerCase() === '@all';

                return (
                    <span
                        key={idx}
                        className={cn(
                            "inline-flex items-center font-bold px-1.5 py-0.5 rounded text-xs mx-0.5 align-middle",
                            isHostMention
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : isAllMention
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "bg-pitch-accent/20 text-pitch-accent border border-pitch-accent/30"
                        )}
                    >
                        {part}
                    </span>
                );
            }
            return <span key={idx}>{part}</span>;
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-pitch-card border border-white/10 rounded-sm">
                <Loader2 className="w-6 h-6 animate-spin text-pitch-accent mb-2" />
                <span className="text-xs uppercase font-bold text-gray-400">Loading lobby chat...</span>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-[600px] bg-pitch-card border border-white/10 rounded-sm overflow-hidden relative", className)}>
            {/* Header */}
            <div className="bg-white/5 p-4 border-b border-white/10 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-heading text-lg font-bold italic uppercase tracking-wider text-white">Event Chat</h3>
                    {isHost && (
                        <span className="bg-pitch-accent text-pitch-black text-[10px] uppercase font-black px-2 py-0.5 rounded-sm">
                            Host Mode
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-pitch-secondary uppercase font-bold">{messages.length} messages</span>
                </div>
            </div>

            {/* Messages Scroll Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-pitch-secondary italic text-sm py-16">
                        No messages yet. Start the conversation or tag someone with <span className="text-pitch-accent font-bold">@name</span>!
                    </div>
                ) : (
                    messages.map((msg, msgIndex) => {
                        const isMe = msg.user_id === currentUserId;
                        const senderName = msg.profiles?.first_name
                            ? `${msg.profiles.first_name} ${msg.profiles.last_name || ''}`.trim()
                            : msg.profiles?.email || 'Unknown';
                        const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const isBroadcastMsg = msg.is_broadcast;
                        const msgReactions = msg.reactions || {};
                        const reactionEntries = Object.entries(msgReactions).filter(([_, uids]) => uids.length > 0);
                        const isTopMessage = msgIndex <= 1;

                        return (
                            <div key={msg.id} className={cn("flex flex-col group relative", isMe ? "items-end" : "items-start")}>
                                {isBroadcastMsg && (
                                    <div className="flex items-center gap-1 text-[10px] uppercase font-black text-red-400 mb-1 tracking-wider">
                                        <Megaphone className="w-3.5 h-3.5" /> Host Broadcast
                                    </div>
                                )}

                                <div className="flex items-end gap-1.5 max-w-[85%]">
                                    {/* Message Bubble */}
                                    <div
                                        className={cn(
                                            "px-4 py-2.5 rounded-lg text-sm break-words relative transition-all",
                                            isBroadcastMsg
                                                ? "bg-red-500/15 border border-red-500/50 text-white"
                                                : isMe
                                                ? "bg-pitch-accent text-pitch-black rounded-tr-none font-medium"
                                                : "bg-white/10 text-gray-200 rounded-tl-none border border-white/5"
                                        )}
                                    >
                                        <div className="leading-relaxed">{renderFormattedContent(msg.content)}</div>
                                    </div>

                                    {/* Quick Reaction Trigger Button (Hover / Touch) */}
                                    {isParticipant && (
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)}
                                                className="p-1 rounded bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-opacity md:opacity-0 md:group-hover:opacity-100"
                                                title="Add reaction"
                                            >
                                                <Smile className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Fixed Emoji Bar Popover (Smart vertical placement prevents top clipping) */}
                                            {activeReactionMsgId === msg.id && (
                                                <div
                                                    className={cn(
                                                        "absolute z-30 flex items-center gap-1 bg-[#171717] border border-white/20 p-1.5 rounded-full shadow-2xl animate-in fade-in zoom-in-95",
                                                        isTopMessage ? "top-full mt-1.5" : "bottom-full mb-1.5",
                                                        isMe ? "right-0" : "left-0"
                                                    )}
                                                >
                                                    {FIXED_EMOJIS.map((emoji) => {
                                                        const hasReacted = (msgReactions[emoji] || []).includes(currentUserId);
                                                        return (
                                                            <button
                                                                key={emoji}
                                                                type="button"
                                                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                                                className={cn(
                                                                    "w-8 h-8 flex items-center justify-center text-base rounded-full transition-transform hover:scale-125 active:scale-95",
                                                                    hasReacted ? "bg-pitch-accent/20 border border-pitch-accent" : "hover:bg-white/10"
                                                                )}
                                                            >
                                                                {emoji}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Active Reaction Pills */}
                                {reactionEntries.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1 mt-1.5 px-1">
                                        {reactionEntries.map(([emoji, userIds]) => {
                                            const userReacted = userIds.includes(currentUserId);
                                            return (
                                                <button
                                                    key={emoji}
                                                    type="button"
                                                    disabled={!isParticipant}
                                                    onClick={() => handleToggleReaction(msg.id, emoji)}
                                                    className={cn(
                                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border transition-all",
                                                        userReacted
                                                            ? "bg-pitch-accent/20 border-pitch-accent text-pitch-accent"
                                                            : "bg-black/40 border-white/10 text-gray-300 hover:border-white/30"
                                                    )}
                                                >
                                                    <span>{emoji}</span>
                                                    <span className="text-[10px] font-bold">{userIds.length}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Sender & Timestamp */}
                                <div className="flex items-center gap-2 mt-1 px-1">
                                    <span className="text-[10px] font-bold uppercase text-gray-400">{senderName}</span>
                                    <span className="text-[10px] text-gray-500">{timeStr}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Mentions Autocomplete Popover */}
            {mentionSearch !== null && mentionCandidates.length > 0 && (
                <div className="absolute bottom-20 left-4 right-4 max-h-48 overflow-y-auto bg-[#171717] border border-pitch-accent/40 rounded-sm shadow-2xl z-40 p-1 divide-y divide-white/5">
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase text-pitch-accent tracking-wider flex items-center gap-1">
                        <AtSign className="w-3 h-3" /> Tag a player
                    </div>
                    {mentionCandidates.map((candidate, idx) => (
                        <button
                            key={candidate.id}
                            type="button"
                            onClick={() => applyMention(candidate.tag)}
                            className={cn(
                                "w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors rounded-sm",
                                idx === selectedMentionIndex ? "bg-pitch-accent text-pitch-black font-bold" : "text-white hover:bg-white/10"
                            )}
                        >
                            <span className="font-medium">{candidate.name}</span>
                            <span className={cn("text-[10px] uppercase", idx === selectedMentionIndex ? "text-pitch-black/70" : "text-gray-400")}>
                                {candidate.subtitle}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Input Footer Area */}
            <div className="bg-white/5 border-t border-white/10 flex flex-col shrink-0">
                {/* Host Broadcast Controls */}
                {isHost && (
                    <div className="px-4 pt-3 flex items-center justify-between border-b border-white/5 pb-2">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-300 cursor-pointer hover:text-white transition-colors">
                            <input
                                type="checkbox"
                                checked={isBroadcast}
                                onChange={(e) => setIsBroadcast(e.target.checked)}
                                className="accent-red-500 w-3.5 h-3.5 rounded"
                            />
                            <Megaphone className="w-3.5 h-3.5 text-red-400" /> Send as Broadcast
                        </label>

                        {isBroadcast && (
                            <label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-300 cursor-pointer hover:text-white transition-colors animate-in fade-in slide-in-from-right-2">
                                <input
                                    type="checkbox"
                                    checked={sendEmailAlert}
                                    onChange={(e) => setSendEmailAlert(e.target.checked)}
                                    className="accent-pitch-accent w-3.5 h-3.5 rounded"
                                />
                                Email Alert All Players
                            </label>
                        )}
                    </div>
                )}

                <form onSubmit={handleSend} className="p-3 flex gap-2 items-center">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            isParticipant
                                ? isBroadcast
                                    ? "Type host announcement..."
                                    : "Type a message... (Type @ to tag a player or @host)"
                                : "Join this event to participate in chat"
                        }
                        disabled={!isParticipant || sending}
                        className={cn(
                            "flex-1 bg-black/60 border rounded px-4 py-2.5 text-sm text-white focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                            isBroadcast ? "border-red-500/50 focus:border-red-500" : "border-white/15 focus:border-pitch-accent"
                        )}
                    />
                    <button
                        type="submit"
                        disabled={!isParticipant || !newMessage.trim() || sending}
                        className={cn(
                            "px-4 py-2.5 rounded font-bold uppercase tracking-wider text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0",
                            isBroadcast ? "bg-red-500 hover:bg-red-400 text-white" : "bg-pitch-accent hover:bg-white text-pitch-black"
                        )}
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span className="hidden sm:inline">Send</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
