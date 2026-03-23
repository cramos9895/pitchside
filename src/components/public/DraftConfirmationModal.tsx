'use client';

import { Users, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Player {
    id: string;
    profiles: {
        full_name: string;
        avatar_url: string | null;
    };
}

interface DraftConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    player: Player | null;
    isProcessing: boolean;
}

export function DraftConfirmationModal({ isOpen, onClose, onConfirm, player, isProcessing }: DraftConfirmationModalProps) {
    if (!isOpen || !player) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative w-full max-w-md bg-pitch-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-pitch-accent/10 rounded-full flex items-center justify-center border border-pitch-accent/20">
                            <Users className="w-8 h-8 text-pitch-accent" />
                        </div>

                        <div>
                            <h3 className="text-xl font-black uppercase italic tracking-widest text-white">
                                Draft Confirmation
                            </h3>
                            <p className="text-gray-400 text-sm mt-1">
                                Are you sure you want to draft <span className="text-white font-bold">{player.profiles.full_name}</span>?
                            </p>
                        </div>

                        <div className="w-full bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex gap-3 text-left">
                            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1">Permanent Action</p>
                                <p className="text-xs text-gray-400 leading-relaxed font-medium">
                                    Once drafted, you <span className="text-white">cannot remove this player</span> from your roster. Only the player can remove themselves or an admin.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col w-full gap-3 pt-4">
                            <button
                                onClick={onConfirm}
                                disabled={isProcessing}
                                className="w-full py-4 bg-pitch-accent hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-lg transition-all shadow-[0_0_20px_rgba(204,255,0,0.1)] active:scale-95 disabled:opacity-50"
                            >
                                {isProcessing ? 'Adding to Roster...' : 'Confirm & Draft Player'}
                            </button>
                            <button
                                onClick={onClose}
                                disabled={isProcessing}
                                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-xs rounded-lg transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
