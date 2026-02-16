'use client';

import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }

        // 1. Android / Desktop: Listen for 'beforeinstallprompt'
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // 2. iOS Detection
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        const isStandalone = (window.navigator as any).standalone;

        if (isIosDevice && !isStandalone) {
            setIsIOS(true);
            // Show iOS prompt after a delay (e.g. 3 seconds) to not be annoying immediately
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
            <div className="bg-pitch-card border border-white/10 p-4 rounded-sm shadow-2xl flex items-center justify-between gap-4 max-w-md mx-auto relative overflow-hidden">

                {/* Close Button */}
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-2 right-2 text-gray-500 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-4">
                    <div className="bg-white p-1 rounded-lg">
                        <img src="/logo.png" alt="App Icon" className="w-10 h-10 object-contain" />
                    </div>
                    <div>
                        <h4 className="font-bold text-white uppercase italic">Install PitchSide</h4>
                        <p className="text-xs text-gray-400">
                            {isIOS
                                ? "Add to Home Screen for the best experience."
                                : "Install our app for quick access!"}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                {!isIOS ? (
                    <button
                        onClick={handleInstallClick}
                        className="bg-pitch-accent text-pitch-black px-4 py-2 font-bold uppercase text-xs rounded-sm hover:bg-white transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                        <Download className="w-4 h-4" /> Install
                    </button>
                ) : (
                    <div className="text-xs text-pitch-accent font-bold flex flex-col items-center">
                        <span>Tap <Share className="w-3 h-3 inline" /></span>
                        <span>Add to Home Screen</span>
                    </div>
                )}
            </div>
        </div>
    );
}
