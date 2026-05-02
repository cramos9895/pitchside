'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ScanFace } from 'lucide-react';

interface PlayerQRCardProps {
    userId: string;
}

export function PlayerQRCard({ userId }: PlayerQRCardProps) {
    const qrPayload = JSON.stringify({ uid: userId });

    return (
        <div className="bg-black/40 rounded-xl p-8 border border-white/5 text-center space-y-6 flex flex-col items-center justify-center">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-pitch-secondary flex items-center gap-2 justify-center">
                <ScanFace className="w-4 h-4 text-pitch-accent" />
                Player Passport
            </h4>
            <div className="bg-white p-4 rounded-xl shadow-[0_0_30px_rgba(204,255,0,0.15)] inline-block">
                <QRCodeSVG 
                    value={qrPayload} 
                    size={200}
                    level="H"
                    includeMargin={false}
                    fgColor="#0a0a0a"
                    bgColor="#ffffff"
                />
            </div>
            <p className="text-[10px] text-gray-400 font-bold tracking-widest max-w-[250px] mx-auto uppercase">
                Present this code to the facility host for check-in and identity verification.
            </p>
        </div>
    );
}
