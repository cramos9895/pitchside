'use client';

import { Loader2, ShieldCheck, X } from 'lucide-react';

interface WaiverModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAgree: () => void;
    loading: boolean;
}

export function WaiverModal({ isOpen, onClose, onAgree, loading }: WaiverModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-pitch-card border border-white/10 p-6 rounded-sm max-w-lg w-full shadow-2xl relative flex flex-col max-h-[90vh]">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="mb-6 flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-pitch-accent" />
                    <div>
                        <h2 className="font-heading text-xl md:text-2xl font-black italic uppercase text-white">
                            Liability Waiver
                        </h2>
                        <p className="text-pitch-secondary text-xs uppercase tracking-widest font-bold">
                            Required One-Time Agreement
                        </p>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto pr-2 mb-6 text-sm text-gray-300 space-y-4 border border-white/5 bg-black/40 p-4 rounded form-scrollbar">
                    <p className="font-bold text-white mb-4 uppercase text-xs tracking-wider">
                        Pitch Side Liability Waiver and Release
                    </p>
                    <p>
                        By clicking &quot;I Agree&quot; and participating in any soccer matches, tournaments, or events organized by Pitch Side, you acknowledge and agree to the following terms:
                    </p>

                    <div>
                        <strong className="text-pitch-accent uppercase text-xs block mb-1">1. Assumption of Risk</strong>
                        <p>
                            You understand that soccer is a physical contact sport. Participation involves inherent risks of physical injury, illness, or property damage. You voluntarily assume all risks associated with playing in Pitch Side events, whether known or unknown, and take full responsibility for your participation.
                        </p>
                    </div>

                    <div>
                        <strong className="text-pitch-accent uppercase text-xs block mb-1">2. Release of Liability</strong>
                        <p>
                            You hereby release, waive, and discharge Pitch Side, its organizers, administrators, facility owners, and other participants from any and all claims, liabilities, or demands arising from your participation. This includes claims resulting from ordinary negligence but does not include gross negligence or willful misconduct.
                        </p>
                    </div>

                    <div>
                        <strong className="text-pitch-accent uppercase text-xs block mb-1">3. Medical Consent</strong>
                        <p>
                            In the event of an emergency, you grant permission to Pitch Side organizers to seek medical treatment on your behalf if you are unable to do so yourself. You acknowledge that you are solely responsible for any medical costs or transportation incurred.
                        </p>
                    </div>

                    <div>
                        <strong className="text-pitch-accent uppercase text-xs block mb-1">4. Media Release</strong>
                        <p>
                            You grant Pitch Side the right to take photographs and videos of you during events. You consent to the use of these media materials for promotional purposes on the Pitch Side app, website, and social media channels without any compensation.
                        </p>
                    </div>

                    <div>
                        <strong className="text-pitch-accent uppercase text-xs block mb-1">5. Code of Conduct</strong>
                        <p>
                            You agree to play safely, respect the organizers and other players, and follow all rules of the venue. Pitch Side reserves the right to remove or ban any player for dangerous play, fighting, or unsporting behavior without a refund.
                        </p>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="mt-auto">
                    <p className="text-xs text-center text-gray-400 mb-4 px-2">
                        You must agree to these terms to join the game. This will securely save to your profile.
                    </p>
                    <button
                        onClick={onAgree}
                        disabled={loading}
                        className="w-full py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-widest text-lg rounded-sm hover:bg-white transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-pitch-accent/20"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "I AGREE TO THESE TERMS"}
                    </button>
                </div>
            </div>
        </div>
    );
}
