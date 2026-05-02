'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle2, AlertTriangle, ShieldAlert, X, User } from 'lucide-react';
import { getPlayerCheckInDetails, uploadEventIdentityPhoto, executeCheckIn, undoCheckIn } from '@/app/actions/check-in';

interface IdentityModalProps {
    scannedUserId: string;
    eventId: string;
    eventType?: 'rolling' | 'tournament' | 'pickup';
    onClose: () => void;
    onCheckInComplete: () => void;
}

export function IdentityModal({ scannedUserId, eventId, eventType = 'rolling', onClose, onCheckInComplete }: IdentityModalProps) {
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    
    // Camera state
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [capturedPhotoBlob, setCapturedPhotoBlob] = useState<Blob | null>(null);

    useEffect(() => {
        loadDetails();
        return () => stopCamera();
    }, [scannedUserId]);

    const loadDetails = async () => {
        try {
            setLoading(true);
            const data = await getPlayerCheckInDetails(scannedUserId, eventId);
            setDetails(data);
            if (!data.identityPhoto) {
                startCamera();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load player details');
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } // Always use rear camera to face players
            });
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            setError("Could not access camera for photo verification.");
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
    };

    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        setCapturedPhotoBlob(blob);
                        stopCamera();
                    }
                }, 'image/jpeg', 0.8);
            }
        }
    };

    const retakePhoto = () => {
        setCapturedPhotoBlob(null);
        startCamera();
    };

    const handleCheckIn = async () => {
        try {
            setProcessing(true);
            
            // If we took a new photo, upload it first
            if (capturedPhotoBlob && !details.identityPhoto) {
                const formData = new FormData();
                formData.append('userId', scannedUserId);
                formData.append('eventId', eventId);
                formData.append('photo', capturedPhotoBlob, 'photo.jpg');
                await uploadEventIdentityPhoto(formData);
            }

            // Execute check-in
            await executeCheckIn(scannedUserId, eventId, eventType);
            if (onCheckInComplete) onCheckInComplete();
        } catch (err: any) {
            setError(err.message || 'Failed to check in player');
        } finally {
            setProcessing(false);
        }
    };

    const handleUndoCheckIn = async () => {
        if (!confirm('Are you sure you want to undo this check-in? If this is a cash game, their payment will be marked as unpaid.')) return;
        setProcessing(true);
        setError(null);
        try {
            await undoCheckIn(scannedUserId, eventId);
            if (onCheckInComplete) onCheckInComplete();
        } catch (err: any) {
            setError(err.message || 'Failed to undo check-in');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                <div className="bg-pitch-card w-full max-w-md rounded-2xl p-8 border border-white/10 text-center flex items-center justify-center min-h-[300px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-pitch-accent"></div>
                </div>
            </div>
        );
    }

    if (error && !details) {
        return (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                <div className="bg-pitch-card w-full max-w-md rounded-2xl p-8 border border-white/10 text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-black uppercase tracking-widest text-white mb-2">Error</h3>
                    <p className="text-gray-400 mb-6">{error}</p>
                    <button onClick={onClose} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-lg uppercase tracking-widest transition-all">Close</button>
                </div>
            </div>
        );
    }

    const { profile, identityPhoto, isCheckedIn, registration } = details;
    const isBanned = profile?.is_banned;
    const needsPhoto = !identityPhoto && !capturedPhotoBlob;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#111] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/50">
                    <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                        <User className="w-4 h-4 text-pitch-accent" /> Player Verification
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto">
                    
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-500">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    {isBanned && (
                        <div className="mb-6 p-4 bg-red-600 border border-red-500 rounded-lg flex flex-col items-center text-center gap-2 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                            <ShieldAlert className="w-8 h-8" />
                            <h4 className="font-black uppercase tracking-widest">Player Suspended</h4>
                            <p className="text-sm opacity-90">{profile.ban_reason || 'This player is currently banned.'}</p>
                        </div>
                    )}

                    {/* Photo Section */}
                    <div className="mb-6">
                        {identityPhoto ? (
                            <div className="text-center">
                                <div className="w-48 h-48 mx-auto rounded-xl overflow-hidden border-2 border-white/20 relative shadow-xl mb-3">
                                    <img src={identityPhoto} alt={profile?.full_name} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-center">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400 flex items-center justify-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Verified ID
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => {
                                    setDetails({ ...details, identityPhoto: null });
                                    startCamera();
                                }} className="text-xs font-bold text-pitch-secondary uppercase tracking-widest hover:text-white underline decoration-white/30 underline-offset-4">
                                    Retake Photo
                                </button>
                            </div>
                        ) : capturedPhotoBlob ? (
                            <div className="text-center">
                                <div className="w-48 h-48 mx-auto rounded-xl overflow-hidden border-2 border-pitch-accent relative shadow-[0_0_20px_rgba(204,255,0,0.2)] mb-3">
                                    <img src={URL.createObjectURL(capturedPhotoBlob)} alt="Captured" className="w-full h-full object-cover" />
                                </div>
                                <button onClick={retakePhoto} className="text-xs font-bold text-pitch-secondary uppercase tracking-widest hover:text-white underline decoration-white/30 underline-offset-4">
                                    Retake Photo
                                </button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="w-48 h-48 mx-auto bg-black rounded-xl overflow-hidden border-2 border-pitch-accent relative mb-3">
                                    <video 
                                        ref={videoRef} 
                                        autoPlay 
                                        playsInline 
                                        muted 
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Grid overlay for alignment */}
                                    <div className="absolute inset-0 border-[4px] border-white/10 m-4 rounded-[40%] pointer-events-none" />
                                </div>
                                <canvas ref={canvasRef} className="hidden" />
                                <button 
                                    onClick={takePhoto}
                                    className="bg-white text-black px-6 py-2 rounded-full font-black uppercase tracking-widest text-xs flex items-center gap-2 mx-auto hover:bg-gray-200 transition-colors"
                                >
                                    <Camera className="w-4 h-4" /> Capture ID Photo
                                </button>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-3 px-4">
                                    First-time check-in requires a locked photo ID for this event.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Player Info */}
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-4">
                        <div className="text-center">
                            <h2 className="text-2xl font-black uppercase tracking-wider">{profile?.full_name}</h2>
                            <p className="text-pitch-accent font-bold uppercase tracking-widest text-xs mt-1 flex items-center justify-center gap-2">
                                {registration?.teamName || 'Unassigned / Free Agent'}
                                {registration?.isCaptain && <span className="text-[9px] bg-pitch-accent text-black px-1.5 py-0.5 rounded font-black tracking-widest">C</span>}
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/10">
                            <div className="bg-white/5 p-3 rounded-lg text-center">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Financial Status</p>
                                {registration?.status === 'paid' || registration?.status === 'confirmed' || (registration?.isCashGame && (registration?.cashCollected || isCheckedIn)) ? (
                                    <span className="text-green-400 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-1">
                                        <CheckCircle2 className="w-4 h-4" /> {registration?.isCashGame ? 'Cash Collected' : 'Paid'}
                                    </span>
                                ) : (
                                    <span className="text-orange-500 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-1">
                                        <AlertTriangle className="w-4 h-4" /> Pending
                                    </span>
                                )}
                            </div>
                            <div className="bg-white/5 p-3 rounded-lg text-center">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Check-In</p>
                                {isCheckedIn ? (
                                    <span className="text-pitch-accent font-black text-sm uppercase tracking-wider flex items-center justify-center gap-1">
                                        <CheckCircle2 className="w-4 h-4" /> Completed
                                    </span>
                                ) : (
                                    <span className="text-gray-400 font-black text-sm uppercase tracking-wider">
                                        Waiting
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/10 bg-black/50">
                    {isCheckedIn ? (
                        <div className="space-y-3">
                            <button 
                                onClick={onClose}
                                className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-xl uppercase tracking-widest transition-all"
                            >
                                Close Modal
                            </button>
                            <button 
                                onClick={handleUndoCheckIn}
                                disabled={processing}
                                className="w-full bg-transparent border border-red-500/50 hover:bg-red-500/10 text-red-500 font-black py-3 rounded-xl uppercase tracking-widest transition-all text-xs"
                            >
                                {processing ? 'Processing...' : 'Undo Check-In'}
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={handleCheckIn}
                            disabled={processing || needsPhoto || isBanned}
                            className={`w-full font-black py-4 rounded-xl uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                                processing || needsPhoto || isBanned
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                : 'bg-pitch-accent text-pitch-black hover:bg-white shadow-[0_0_30px_rgba(204,255,0,0.15)]'
                            }`}
                        >
                            {processing ? (
                                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            ) : needsPhoto ? (
                                'Capture Photo Required'
                            ) : isBanned ? (
                                'Player Suspended'
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" /> 
                                    {(registration?.status === 'paid' || registration?.status === 'confirmed') ? 'Verify & Check In' : 'Confirm Payment & Check In'}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
