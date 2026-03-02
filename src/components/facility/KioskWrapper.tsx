'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { Maximize, Minimize } from 'lucide-react';

export function KioskWrapper({ children }: { children: ReactNode }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await containerRef.current?.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            }
        }
    };

    return (
        <div
            ref={containerRef}
            className={`relative bg-black text-white transition-all ${isFullscreen
                ? 'w-full h-screen overflow-hidden flex flex-col bg-black'
                : 'min-h-screen rounded-lg border border-white/10'
                }`}
        >
            <button
                onClick={toggleFullscreen}
                className="z-[100] p-4 bg-white/10 hover:bg-white/20 transition-colors rounded-full text-white shadow-2xl backdrop-blur-md"
                title="Toggle Fullscreen"
                style={{ position: isFullscreen ? 'fixed' : 'absolute', bottom: '2rem', right: '2rem' }}
            >
                {isFullscreen ? <Minimize className="w-8 h-8" /> : <Maximize className="w-8 h-8" />}
            </button>
            <div className={`pt-2 flex-1 animate-in fade-in duration-1000 ${isFullscreen ? 'overflow-y-auto p-12' : 'p-8'}`}>
                {children}
            </div>
        </div>
    );
}
