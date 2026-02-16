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

    // Always render to show the option exists
    // if (!isInstallable && !deferredPrompt) return null;

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-sm animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <div className="bg-white p-1 rounded-lg shrink-0">
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
            <div className="flex justify-end w-full md:w-auto">
                {!isIOS ? (
                    isInstallable ? (
                        <button
                            onClick={handleInstallClick}
                            className="bg-pitch-accent text-pitch-black px-4 py-2 font-bold uppercase text-xs rounded-sm hover:bg-white transition-colors flex items-center gap-2 whitespace-nowrap"
                        >
                            <Download className="w-4 h-4" /> Install
                        </button>
                    ) : (
                        <div className="text-xs text-gray-500 font-medium text-right max-w-[150px]">
                            Install via browser menu
                        </div>
                    )
                ) : (
                    <div className="text-xs text-pitch-accent font-bold flex flex-col items-end text-right bg-pitch-accent/5 p-3 rounded-sm border border-pitch-accent/20">
                        <span className="flex items-center gap-1 uppercase tracking-wider text-[10px] text-gray-400 mb-1">To Install:</span>
                        <div className="flex flex-col gap-1">
                            <span>1. Tap <Share className="w-3 h-3 inline mx-0.5" /> Share</span>
                            <span>2. Tap 'Add to Home Screen'</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
