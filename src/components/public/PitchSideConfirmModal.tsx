'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 🏗️ Architecture: [[PitchSideConfirmModal.md]]
 * MANDATORY global standard for user confirmation dialogs.
 * BANS the use of window.confirm().
 */

interface PitchSideConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    isProcessing?: boolean;
}

export function PitchSideConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false,
    isProcessing = false
}: PitchSideConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop: Dark Translucent Glassmorphism */}
            <div 
                className="absolute inset-0 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={isProcessing ? undefined : onClose}
            />
            
            {/* Modal Card: Obsidian #171717 */}
            <div className="relative w-full max-w-md bg-[#171717] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8">
                    {!isProcessing && (
                        <button 
                            onClick={onClose}
                            className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}

                    <div className="flex flex-col items-center text-center space-y-6">
                        {/* Icon/Signal */}
                        <div className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center border",
                            isDestructive 
                                ? "bg-red-500/10 border-red-500/20" 
                                : "bg-[#ccff00]/10 border-[#ccff00]/20"
                        )}>
                            <AlertTriangle className={cn(
                                "w-8 h-8",
                                isDestructive ? "text-red-500" : "text-[#ccff00]"
                            )} />
                        </div>

                        {/* Text Content */}
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">
                                {title}
                            </h3>
                            <div className="text-gray-400 text-sm font-medium leading-relaxed font-sans">
                                {description}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col w-full gap-3 pt-4">
                            <button
                                onClick={onConfirm}
                                disabled={isProcessing}
                                className={cn(
                                    "w-full py-4 font-black uppercase tracking-widest text-xs rounded-lg transition-all active:scale-95 disabled:opacity-50",
                                    isDestructive 
                                        ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.2)]" 
                                        : "bg-[#ccff00] hover:bg-white text-black shadow-[0_0_20px_rgba(204,255,0,0.1)]"
                                )}
                            >
                                {isProcessing ? 'Processing...' : confirmText}
                            </button>
                            
                            <button
                                onClick={onClose}
                                disabled={isProcessing}
                                className="w-full py-4 bg-transparent hover:bg-white/5 text-pitch-secondary hover:text-white font-black uppercase tracking-widest text-[10px] rounded-lg transition-all disabled:opacity-50"
                            >
                                {cancelText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
