'use client';

import { useState } from 'react';
import { Shield, Loader2, X } from 'lucide-react';

interface OTPVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerify: (code: string) => Promise<void>;
    userName: string;
}

export default function OTPVerificationModal({ isOpen, onClose, onVerify, userName }: OTPVerificationModalProps) {
    const [code, setCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length !== 6) {
            setError('Please enter a valid 6-digit code.');
            return;
        }

        setVerifying(true);
        setError(null);
        try {
            await onVerify(code);
        } catch (err: any) {
            setError(err.message || 'Verification failed');
            setVerifying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-pitch-black border border-red-500/30 rounded-sm shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 rotate-1">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-red-500/20 rounded-full border border-red-500/50">
                        <Shield className="w-10 h-10 text-red-500 animate-pulse" />
                    </div>
                </div>

                <h2 className="text-2xl font-heading font-bold uppercase italic text-center text-white mb-2">
                    Security <span className="text-red-500">Airgap</span>
                </h2>
                <p className="text-gray-400 text-sm text-center mb-8">
                    Elevating <span className="text-white font-bold">{userName}</span> to Master Admin requires a verification code sent to <span className="text-pitch-accent font-bold">support@pitchsidecf.com</span>.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input
                            type="text"
                            maxLength={6}
                            placeholder="000000"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-black/50 border-2 border-white/10 rounded-sm py-4 text-center text-4xl font-numeric font-black tracking-widest text-pitch-accent focus:border-red-500 outline-none transition-all placeholder:text-white/5"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-xs font-bold text-center uppercase">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={verifying || code.length !== 6}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-red-600 text-white font-black uppercase tracking-wider rounded-sm hover:bg-red-500 transition-colors disabled:opacity-50 disabled:grayscale"
                    >
                        {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                        {verifying ? "Verifying..." : "Confirm Elevation"}
                    </button>
                </form>

                <p className="mt-8 text-[10px] text-gray-600 uppercase text-center tracking-tighter leading-tight font-bold">
                    This action is logged. Unauthorized elevation attempts will result in immediate system lockout and administrative audit.
                </p>
            </div>
        </div>
    );
}
