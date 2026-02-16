'use client';

import { useState, useEffect } from 'react';
import { Download, Share, CheckCircle } from 'lucide-react';

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsStandalone(true);
        }

        // 1. Android / Desktop: Listen for 'beforeinstallprompt'
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // 2. iOS Detection
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);

        if (isIosDevice) {
            setIsIOS(true);
            setIsInstallable(true); // Always "installable" on iOS via manual steps
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
            setIsInstallable(false);
        }
    };

    if (isStandalone) {
        return (
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-1 rounded-lg">
                        <img src="/logo.png" alt="App Icon" className="w-10 h-10 object-contain" />
                    </div>
                    <div>
                        <h4 className="font-bold text-white">PitchSide App</h4>
                        <p className="text-sm text-pitch-accent flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Installed & Active
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isInstallable && !deferredPrompt) {
        return null;
    }

    return (
        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-sm animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <div className="bg-white p-1 rounded-lg">
                    <img src="/logo.png" alt="App Icon" className="w-10 h-10 object-contain" />
                </div>
                <div>
                    <h4 className="font-bold text-white">Install PitchSide</h4>
                    <p className="text-sm text-pitch-secondary">
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
                <div className="text-xs text-pitch-accent font-bold flex flex-col items-end text-right">
                    <span>Tap <Share className="w-3 h-3 inline" /></span>
                    <span>Add to Home Screen</span>
                </div>
            )}
        </div>
    );
}
