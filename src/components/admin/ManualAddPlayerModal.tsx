'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { manualAddPlayerAction } from '@/app/actions/manual-add-player';
import { UserPlus, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface Props {
    gameId: string;
    basePrice: number;
    onSuccess: () => void;
}

export function ManualAddPlayerModal({ gameId, basePrice, onSuccess }: Props) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<{ id: string; full_name: string | null; email: string | null; } | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('manual_fix');
    const [submitting, setSubmitting] = useState(false);
    
    const { success, error: toastError } = useToast();
    const supabase = createClient();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        setSearching(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
                .limit(10);
            
            if (error) throw error;
            setSearchResults(data || []);
            // Only unselect if we searched a new term and the user isn't in results
            if (selectedUser && !data?.find(u => u.id === selectedUser.id)) {
                setSelectedUser(null);
            }
        } catch (err: any) {
            toastError("Search failed: " + err.message);
        } finally {
            setSearching(false);
        }
    };

    const handleAdd = async () => {
        if (!selectedUser || !selectedUser.id || !gameId) return;
        setSubmitting(true);
        try {
            const res = await manualAddPlayerAction(gameId as string, selectedUser.id as string, paymentMethod as string, basePrice);
            if (res.success) {
                success(res.message || 'Player successfully added.');
                setOpen(false);
                setSelectedUser(null);
                setSearchQuery('');
                setSearchResults([]);
                onSuccess();
            } else {
                toastError(res.error || "Failed to add player.");
            }
        } catch (err: any) {
            toastError("Error adding player: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-pitch-card border border-white/10 text-white text-sm font-bold uppercase hover:bg-white/5 rounded transition-colors"
            >
                <UserPlus className="w-4 h-4 text-pitch-accent" /> Manual Add
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-pitch-card border border-white/10 shadow-2xl rounded-sm w-full max-w-md flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gray-900/50">
                    <h2 className="font-heading text-2xl font-bold uppercase italic text-white flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-pitch-accent" /> Add Player
                    </h2>
                    <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white p-2">✕</button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <form onSubmit={handleSearch} className="mb-6 space-y-2">
                        <label className="text-xs font-bold uppercase text-pitch-secondary tracking-wider">Search Public Profiles</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-black border border-white/10 p-2 text-white text-sm focus:outline-none focus:border-pitch-accent rounded-sm"
                            />
                            <button
                                type="submit"
                                disabled={searching}
                                className="px-3 py-2 bg-pitch-accent text-black font-bold uppercase rounded-sm hover:bg-white transition-colors disabled:opacity-50"
                            >
                                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            </button>
                        </div>
                    </form>

                    {searchResults.length > 0 && (
                        <div className="mb-6 space-y-2">
                            <label className="text-xs font-bold uppercase text-pitch-secondary tracking-wider">Results ({searchResults.length})</label>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                {searchResults.map(user => (
                                    <div
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        className={`p-3 border rounded-sm cursor-pointer transition-colors ${selectedUser?.id === user.id ? 'bg-pitch-accent/10 border-pitch-accent text-white' : 'bg-black border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}
                                    >
                                        <div className="font-bold text-sm truncate">{user.full_name || 'Unknown'}</div>
                                        <div className="text-xs opacity-70 truncate">{user.email || 'No Email'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedUser && (
                        <div className="space-y-4 pt-4 border-t border-white/10 border-dashed">
                            <div>
                                <label className="text-xs font-bold uppercase text-pitch-secondary tracking-wider mb-2 block">Payment Resolution</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full bg-black border border-white/10 p-2 text-white text-sm focus:outline-none focus:border-pitch-accent rounded-sm"
                                >
                                    <option value="manual_fix">Manual Fix (System Error)</option>
                                    <option value="cash">Cash Payment</option>
                                    <option value="comp">Comped (Free Spot)</option>
                                </select>
                            </div>

                            <button
                                onClick={handleAdd}
                                disabled={submitting}
                                className="w-full py-3 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                                Insert {selectedUser.full_name}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
