'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, ScanLine, ShieldCheck } from 'lucide-react';

interface GlobalPassportModalProps {
    userId: string;
    onClose: () => void;
}

export function GlobalPassportModal({ userId, onClose }: GlobalPassportModalProps) {
    const payload = JSON.stringify({ uid: userId });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm bg-pitch-black border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(204,255,0,0.1)]">
                
                {/* Header */}
                <div className="bg-black/50 p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-black italic uppercase tracking-tighter text-white flex items-center gap-2 text-lg">
                        <ScanLine className="w-5 h-5 text-pitch-accent" /> Player Passport
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 text-center space-y-6">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                        Present this QR code to the facility host when you arrive to verify your identity and financial status.
                    </p>

                    <div className="bg-white p-4 rounded-xl shadow-[0_0_30px_rgba(204,255,0,0.2)] inline-block relative group">
                        {/* Scanning Laser Effect (Pure CSS) */}
                        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">

                        </div>
                        <QRCodeSVG 
                            value={payload}
                            size={200}
                            level="H"
                            includeMargin={false}
                            className="w-48 h-48 sm:w-56 sm:h-56"
                        />
                    </div>

                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-pitch-accent pt-2">
                        <ShieldCheck className="w-3 h-3" /> Secure Access Generated
                    </div>
                </div>
            </div>
            
        </div>
    );
}
