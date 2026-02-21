
'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send, User as UserIcon, Loader2, Megaphone, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    is_broadcast?: boolean;
    profiles: {
        full_name: string;
        email: string;
    } | null;
}

interface ChatInterfaceProps {
    gameId: string;
    currentUserId: string;
    isParticipant: boolean;
    isHost?: boolean;
}

export function ChatInterface({ gameId, currentUserId, isParticipant, isHost }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isBroadcast, setIsBroadcast] = useState(false);
    const [sendEmailAlert, setSendEmailAlert] = useState(false);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Fetch Initial Messages
    useEffect(() => {
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*, profiles(full_name, email)')
                .eq('event_id', gameId)
                .order('created_at', { ascending: true });

            if (data) {
                setMessages(data as any);
            }
            setLoading(false);
        };

        fetchMessages();

        // Realtime Subscription
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
                async (payload) => {
                    // Fetch profile for the new message
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('full_name, email')
                        .eq('id', payload.new.user_id)
                        .single();

                    const newMsg: Message = {
                        id: payload.new.id,
                        content: payload.new.content,
                        created_at: payload.new.created_at,
                        user_id: payload.new.user_id,
                        is_broadcast: payload.new.is_broadcast,
                        profiles: profileData
                    };

                    setMessages((prev) => [...prev, newMsg]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [gameId, supabase]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            const content = newMessage.trim();
            const { error, data: insertedMessage } = await supabase.from('messages').insert({
                event_id: gameId,
                user_id: currentUserId,
                content: content,
                is_broadcast: isHost ? isBroadcast : false
            }).select().single();

            if (error) throw error;

            setNewMessage('');
            setIsBroadcast(false); // Reset toggle after send

            // Check for notifications (@host or explicit broadcast email)
            const hasHostTag = content.toLowerCase().includes('@host');
            if ((isHost && isBroadcast && sendEmailAlert) || hasHostTag) {
                // Background trigger (fire and forget)
                fetch('/api/messages/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gameId,
                        messageId: insertedMessage.id,
                        content,
                        isBroadcast: isHost && isBroadcast && sendEmailAlert,
                        hasHostTag
                    })
                }).catch(err => console.error("Error triggering notification API:", err));
            }

        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-pitch-secondary" /></div>;
    }

    // Determine access
    if (!isParticipant) {
        // Technically RLS handles this, but UI can be nicer.
        // User request said: "Participants ... and Admins". 
        // We'll trust the parent to pass isParticipant=true if user is either.
    }

    return (
        <div className="flex flex-col h-[600px] bg-pitch-card border border-white/10 rounded-sm overflow-hidden">
            {/* Header */}
            <div className="bg-white/5 p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-heading text-lg font-bold italic uppercase tracking-wider text-white">Event Chat</h3>
                <span className="text-xs text-pitch-secondary uppercase font-bold">{messages.length} messages</span>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
            >
                {messages.length === 0 ? (
                    <div className="text-center text-pitch-secondary italic text-sm py-10">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.user_id === currentUserId;
                        const senderName = msg.profiles?.full_name || msg.profiles?.email || 'Unknown';
                        const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        const isBroadcastMsg = msg.is_broadcast;

                        return (
                            <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                                {isBroadcastMsg && (
                                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-400 mb-1">
                                        <Megaphone className="w-3 h-3" /> Host Broadcast
                                    </div>
                                )}
                                <div className={cn(
                                    "max-w-[80%] px-4 py-2 rounded-lg text-sm break-words",
                                    isBroadcastMsg
                                        ? "bg-red-500/20 border border-red-500/50 text-white"
                                        : isMe
                                            ? "bg-pitch-accent text-pitch-black rounded-tr-none font-medium"
                                            : "bg-white/10 text-gray-200 rounded-tl-none"
                                )}>
                                    {msg.content}
                                </div>
                                <div className="flex items-center gap-2 mt-1 px-1">
                                    <span className="text-[10px] font-bold uppercase text-gray-400">{senderName}</span>
                                    <span className="text-[10px] text-gray-600">{timeStr}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input Area */}
            <div className="bg-white/5 border-t border-white/10 flex flex-col">
                {/* Host Broadcast Toggles */}
                {isHost && (
                    <div className="px-4 pt-3 flex items-center justify-between border-b border-white/5 pb-2">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-300 cursor-pointer hover:text-white transition-colors">
                            <input
                                type="checkbox"
                                checked={isBroadcast}
                                onChange={(e) => setIsBroadcast(e.target.checked)}
                                className="accent-red-500 w-3 h-3"
                            />
                            <Megaphone className="w-3 h-3 text-red-400" /> Send as Broadcast
                        </label>

                        {isBroadcast && (
                            <label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-300 cursor-pointer hover:text-white transition-colors animate-in fade-in slide-in-from-right-2">
                                <input
                                    type="checkbox"
                                    checked={sendEmailAlert}
                                    onChange={(e) => setSendEmailAlert(e.target.checked)}
                                    className="accent-pitch-accent w-3 h-3"
                                />
                                Also Send Email Alert
                            </label>
                        )}
                    </div>
                )}

                <form onSubmit={handleSend} className="p-4 flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={isParticipant ? (isBroadcast ? "Type your announcement..." : "Type a message... (Use @host to alert hosts)") : "Join this event to chat"}
                        disabled={!isParticipant || sending}
                        className={cn(
                            "flex-1 bg-black/50 border rounded px-4 py-2 text-sm text-white focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                            isBroadcast ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-pitch-accent"
                        )}
                    />
                    <button
                        type="submit"
                        disabled={!isParticipant || !newMessage.trim() || sending}
                        className={cn(
                            "p-2 rounded text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                            isBroadcast ? "bg-red-500 hover:bg-red-400" : "bg-pitch-accent hover:bg-white"
                        )}
                    >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        </div>
    );
}
