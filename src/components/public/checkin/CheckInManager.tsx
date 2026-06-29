'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Scan, X } from 'lucide-react';
import { IdentityModal } from './IdentityModal';

interface CheckInManagerProps {
    eventId: string;
    eventType?: 'rolling' | 'tournament' | 'pickup';
    onCheckInComplete?: () => void;
}

export function CheckInManager({ eventId, eventType = 'rolling', onCheckInComplete }: CheckInManagerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [scannedUserId, setScannedUserId] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    const startScanner = () => {
        setIsScanning(true);
        setScannedUserId(null);
    };

    useEffect(() => {
        if (!isScanning) return;
        
        let html5QrCode: Html5Qrcode;
        
        const initScanner = async () => {
            try {
                // Small delay to ensure React has mounted the #reader div
                await new Promise(resolve => setTimeout(resolve, 100));
                
                html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                    },
                    (decodedText) => {
                        try {
                            const payload = JSON.parse(decodedText);
                            if (payload.uid) {
                                html5QrCode.stop().then(() => {
                                    setIsScanning(false);
                                    setScannedUserId(payload.uid);
                                }).catch(console.error);
                            }
                        } catch (e) {
                            console.error("Invalid QR code format");
                        }
                    },
                    (errorMessage) => {
                        // Parse errors ignored
                    }
                );
            } catch (err) {
                console.error("Failed to start scanner", err);
                setIsScanning(false);
            }
        };

        initScanner();

        return () => {
            if (html5QrCode) {
                try {
                    html5QrCode.stop().catch(() => {});
                } catch (e) {}
            }
            // Force kill any lingering video streams
            setTimeout(() => {
                const videoEl = document.querySelector('#reader video') as HTMLVideoElement;
                if (videoEl && videoEl.srcObject) {
                    const stream = videoEl.srcObject as MediaStream;
                    stream.getTracks().forEach(track => track.stop());
                    videoEl.srcObject = null;
                }
            }, 100);
        };
    }, [isScanning]);

    const stopScanner = () => {
        setIsScanning(false);
        
        // Try graceful stop
        if (scannerRef.current) {
            try {
                scannerRef.current.stop().catch(() => {});
            } catch (e) {}
        }
        
        // Force kill any lingering video streams
        setTimeout(() => {
            const videoEl = document.querySelector('#reader video') as HTMLVideoElement;
            if (videoEl && videoEl.srcObject) {
                const stream = videoEl.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                videoEl.srcObject = null;
            }
        }, 100);
    };

    return (
        <div className="w-full">
            {!isScanning && !scannedUserId && (
                <button 
                    onClick={startScanner}
                    className="w-full bg-pitch-accent text-pitch-black hover:bg-white font-black py-4 rounded-xl uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(204,255,0,0.15)]"
                >
                    <Scan className="w-6 h-6" /> Open Scanner
                </button>
            )}

            {isScanning && (
                <div className="bg-black/50 border border-white/10 rounded-2xl p-4 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black uppercase tracking-widest text-sm text-pitch-accent flex items-center gap-2">
                            <Scan className="w-4 h-4" /> Ready to Scan
                        </h3>
                        <button onClick={stopScanner} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="relative w-full aspect-square max-w-sm mx-auto overflow-hidden rounded-xl border-2 border-white/10 bg-black">
                        <div id="reader" className="w-full h-full" />
                    </div>
                    
                    <p className="text-center text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-4">
                        Align the Player Passport QR code within the frame
                    </p>
                </div>
            )}

            {scannedUserId && (
                <IdentityModal 
                    scannedUserId={scannedUserId} 
                    eventId={eventId}
                    eventType={eventType}
                    onClose={() => setScannedUserId(null)}
                    onCheckInComplete={() => {
                        setScannedUserId(null);
                        setIsScanning(false);
                        if (onCheckInComplete) onCheckInComplete();
                    }}
                />
            )}
        </div>
    );
}
