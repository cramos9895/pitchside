
'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send, User as UserIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles: {
        full_name: string;
        email: string;
    } | null;
}

interface ChatInterfaceProps {
    gameId: string;
    currentUserId: string;
    isParticipant: boolean; // Just for UI feedback or hiding input if strict
}

export function ChatInterface({ gameId, currentUserId, isParticipant }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
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
            const { error } = await supabase.from('messages').insert({
                event_id: gameId,
                user_id: currentUserId,
                content: newMessage.trim()
            });

            if (error) throw error;
            setNewMessage('');
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

                        return (
                            <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                                <div className={cn(
                                    "max-w-[80%] px-4 py-2 rounded-lg text-sm break-words",
                                    isMe
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
            <form onSubmit={handleSend} className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isParticipant ? "Type a message..." : "Join this event to chat"}
                    disabled={!isParticipant || sending}
                    className="flex-1 bg-black/50 border border-white/10 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-pitch-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                    type="submit"
                    disabled={!isParticipant || !newMessage.trim() || sending}
                    className="bg-pitch-accent text-pitch-black p-2 rounded hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
            </form>
        </div>
    );
}
