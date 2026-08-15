'use client';

import { useState } from 'react';
import { Search, X, User as UserIcon, Loader2, MessageSquare } from 'lucide-react';
import { searchPlayersForChat, getOrCreateDirectConversation, SearchPlayerResult } from '@/app/actions/messenger';
import { cn } from '@/lib/utils';

interface NewConversationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConversationCreated: (conversationId: string) => void;
}

export function NewConversationModal({ isOpen, onClose, onConversationCreated }: NewConversationModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchPlayerResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSearch = async (val: string) => {
        setQuery(val);
        setError(null);
        if (!val.trim()) {
            setResults([]);
            return;
        }

        setSearching(true);
        try {
            const data = await searchPlayersForChat(val);
            setResults(data);
        } catch (err) {
            console.error('Player search error:', err);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectPlayer = async (playerId: string) => {
        setCreating(true);
        setError(null);
        try {
            const res = await getOrCreateDirectConversation(playerId);
            if (res.success && res.conversationId) {
                onConversationCreated(res.conversationId);
                onClose();
            } else {
                setError(res.error || 'Could not start conversation.');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to start conversation.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#171717] border border-white/15 w-full max-w-md rounded-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
                {/* Modal Header */}
                <div className="bg-white/5 px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-pitch-accent" />
                        <h3 className="font-heading font-black italic uppercase tracking-wider text-base text-white">
                            New Direct Message
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Search Input */}
                <div className="p-4 border-b border-white/10">
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search players by name..."
                            autoFocus
                            className="w-full bg-black/60 border border-white/15 focus:border-pitch-accent rounded-sm pl-9 pr-4 py-2 text-sm text-white focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-500/10 border-l-2 border-red-500 text-red-300 text-xs px-4 py-2 mx-4 mt-3">
                        {error}
                    </div>
                )}

                {/* Player Results List */}
                <div className="max-h-72 overflow-y-auto p-2 divide-y divide-white/5">
                    {searching ? (
                        <div className="py-8 text-center text-xs uppercase font-bold text-gray-400 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-pitch-accent" /> Searching players...
                        </div>
                    ) : query.trim().length > 0 && results.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-400 italic">
                            No players found matching &ldquo;{query}&rdquo;.
                        </div>
                    ) : query.trim().length === 0 ? (
                        <div className="py-8 text-center text-xs uppercase font-bold text-gray-500">
                            Type a name to search registered players
                        </div>
                    ) : (
                        results.map((player) => {
                            const displayName = player.first_name 
                                ? `${player.first_name} ${player.last_name || ''}`.trim() 
                                : player.email || 'Player';

                            return (
                                <button
                                    key={player.id}
                                    type="button"
                                    disabled={creating}
                                    onClick={() => handleSelectPlayer(player.id)}
                                    className="w-full p-3 flex items-center justify-between text-left hover:bg-white/5 rounded-sm transition-colors group disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/10 group-hover:border-pitch-accent group-hover:text-pitch-accent transition-colors">
                                            <UserIcon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white group-hover:text-pitch-accent transition-colors">
                                                {displayName}
                                            </p>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">
                                                Player
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] uppercase font-black text-pitch-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                        Message &rarr;
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
