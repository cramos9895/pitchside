'use client';

import { useState } from 'react';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { WaiverModal } from '@/components/WaiverModal';

interface WaiverGatewayProps {
    facilityId: string;
    facilityName: string;
    hasSignedWaiver: boolean;
    joinAction: () => Promise<void>;
}

export function WaiverGateway({ facilityId, facilityName, hasSignedWaiver, joinAction }: WaiverGatewayProps) {
    const [isWaiverOpen, setIsWaiverOpen] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [isSignedLocally, setIsSignedLocally] = useState(hasSignedWaiver);

    const handleJoinClick = async () => {
        if (!isSignedLocally) {
            setIsWaiverOpen(true);
            return;
        }

        setIsJoining(true);
        try {
            await joinAction();
        } catch (error) {
            console.error("Failed to join roster:", error);
            setIsJoining(false);
        }
    };

    return (
        <div className="flex flex-col items-center">
            {/* Action Button */}
            <button
                onClick={handleJoinClick}
                disabled={isJoining}
                className="w-full relative group overflow-hidden bg-pitch-accent text-black font-black uppercase tracking-widest text-lg rounded-xl transition-all"
            >
                <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <div className="relative py-4 flex items-center justify-center gap-2">
                    {isJoining ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Joining...
                        </>
                    ) : (
                        <>
                            Join Roster
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </div>
            </button>

            {/* Waiver Disclaimer */}
            <p className="text-[10px] text-gray-500 text-center mt-3 uppercase tracking-wider font-bold">
                By joining, you agree to {facilityName}'s rules and facility waivers.
            </p>

            {/* The Waiver Modal */}
            <WaiverModal
                isOpen={isWaiverOpen}
                onClose={() => setIsWaiverOpen(false)}
                onAgree={() => {
                    setIsSignedLocally(true);
                    setIsWaiverOpen(false);
                    // Automatically trigger join after signing
                    setIsJoining(true);
                    joinAction().catch(() => setIsJoining(false));
                }}
                facilityId={facilityId}
                loading={isJoining}
            />
        </div>
    );
}
