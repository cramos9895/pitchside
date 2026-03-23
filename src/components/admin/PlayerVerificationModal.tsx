import { 
    X, 
    User, 
    Camera, 
    CheckCircle2, 
    CreditCard, 
    Loader2,
    ShieldCheck,
    Upload,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

interface PlayerVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: any;
    mode: 'global' | 'match';
    onCheckIn: (player: any) => Promise<void>;
    onPhotoUpload: (file: File) => Promise<void>;
    onWaiverOverride: (player: any, status: boolean) => Promise<void>;
    isUpdating: boolean;
    strictWaiverRequired?: boolean;
}

export function PlayerVerificationModal({ 
    isOpen, 
    onClose, 
    player, 
    mode, 
    onCheckIn, 
    onPhotoUpload,
    onWaiverOverride,
    isUpdating,
    strictWaiverRequired = false
}: PlayerVerificationModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const [isUploading, setIsUploading] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [showOptions, setShowOptions] = useState(false);

    const getPlayerName = (p: any) => {
        if (!p) return 'Unknown';
        if (p.full_name) return p.full_name;
        const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
        return profile?.full_name || 'Unknown Player';
    };

    const getAvatarUrl = (p: any) => {
        const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
        return profile?.avatar_url || p.avatar_url;
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setCameraActive(false);
    };

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        try {
            await onPhotoUpload(file);
            setShowOptions(false);
            setCameraActive(false);
        } catch (error) {
            console.error("Upload failed in Modal:", error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' }, 
                audio: false 
            });
            setStream(mediaStream);
            setCameraActive(true);
            setShowOptions(false);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please check permissions.");
        }
    };

    // Cleanup camera on close
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            setShowOptions(false);
        }
    }, [isOpen]);

    if (!isOpen || !player) return null;

    const playerName = getPlayerName(player);
    const avatarUrl = getAvatarUrl(player);
    const hasDigitalWaiver = player.has_signed;
    const hasPhysicalWaiver = player.has_physical_waiver;
    const isWaiverCompliant = hasDigitalWaiver || hasPhysicalWaiver;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        uploadFile(file);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context?.drawImage(videoRef.current, 0, 0);
            
            canvasRef.current.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    uploadFile(file);
                    stopCamera();
                }
            }, 'image/jpeg', 0.95);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
                {/* Modal Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-lg font-bold uppercase tracking-tight line-clamp-1">{playerName}</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 md:p-8 flex flex-col items-center">
                    {/* Headshot Section */}
                    <div className="relative mb-8 w-full flex flex-col items-center">
                        <div className={cn(
                            "w-48 h-48 md:w-64 md:h-64 rounded-2xl bg-black border border-white/10 flex items-center justify-center relative overflow-hidden transition-all shadow-2xl",
                            !isUploading && !cameraActive && "hover:border-pitch-accent cursor-pointer active:scale-[0.98]"
                        )} onClick={() => !cameraActive && !isUploading && setShowOptions(!showOptions)}>
                            
                            {isUploading ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-12 h-12 animate-spin text-pitch-accent" />
                                    <span className="text-[10px] font-black uppercase text-pitch-accent tracking-widest">Uploading...</span>
                                </div>
                            ) : cameraActive ? (
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    className="w-full h-full object-cover"
                                />
                            ) : player.verification_photo_url ? (
                                <img src={player.verification_photo_url} alt="Headshot" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center gap-4 text-gray-700">
                                    <Camera className="w-16 h-16" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">No Photo Captured</span>
                                </div>
                            )}

                            {/* Overlay for non-active camera */}
                            {!cameraActive && !isUploading && (
                                <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                    <Camera className="w-8 h-8 text-pitch-accent" />
                                    <span className="text-[10px] font-black uppercase text-white tracking-widest">{player.verification_photo_url ? 'Change Photo' : 'Capture Photo'}</span>
                                </div>
                            )}
                        </div>

                        {/* Options Selection Overlay */}
                        {showOptions && !isUploading && !cameraActive && (
                            <div className="absolute top-0 left-0 w-full h-full flex flex-col gap-2 p-4 bg-black/80 backdrop-blur-md rounded-2xl animate-in fade-in zoom-in-95 z-10 items-center justify-center">
                                <button 
                                    onClick={startCamera}
                                    className="w-full py-4 bg-pitch-accent text-black rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-white transition-colors"
                                >
                                    <Camera className="w-4 h-4" /> Take Photo
                                </button>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-4 bg-white/10 border border-white/20 text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
                                >
                                    <Upload className="w-4 h-4" /> Upload File
                                </button>
                                <button 
                                    onClick={() => setShowOptions(false)}
                                    className="mt-2 text-[10px] font-black uppercase text-gray-500 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {/* Camera Controls */}
                        {cameraActive && (
                            <div className="absolute bottom-4 left-0 w-full flex justify-center gap-4 z-20 px-4">
                                <button 
                                    onClick={stopCamera}
                                    className="p-4 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all active:scale-95"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <button 
                                    onClick={capturePhoto}
                                    className="p-4 bg-pitch-accent text-black rounded-full shadow-[0_0_30px_rgba(204,255,0,0.4)] hover:scale-110 transition-all active:scale-90"
                                >
                                    <Camera className="w-8 h-8" />
                                </button>
                                <button 
                                    onClick={startCamera}
                                    className="p-4 bg-white/10 text-white rounded-full shadow-lg hover:bg-white/20 transition-all active:scale-95"
                                    title="Switch Camera"
                                >
                                    <RefreshCw className="w-6 h-6" />
                                </button>
                            </div>
                        )}

                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        <canvas ref={canvasRef} className="hidden" />
                    </div>

                    {/* Compliance Data */}
                    <div className="w-full grid grid-cols-2 gap-4 mb-8">
                        <div className={cn(
                            "p-4 rounded-xl border flex flex-col items-center gap-2 transition-colors",
                            isWaiverCompliant || !strictWaiverRequired
                                ? "bg-green-500/5 border-green-500/20 text-green-500" 
                                : "bg-red-500/5 border-red-500/20 text-red-500"
                        )}>
                            {hasPhysicalWaiver ? <ShieldCheck className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                            <div className="text-[10px] font-black uppercase tracking-widest text-center leading-none">Waiver Status</div>
                            <div className="text-xs font-bold uppercase">
                                {hasDigitalWaiver ? 'Signed (Digital)' : hasPhysicalWaiver ? 'Verified (Physical)' : !strictWaiverRequired ? 'Not Required' : 'Missing'}
                            </div>
                        </div>
                        <div className="p-4 rounded-xl border bg-blue-500/5 border-blue-500/20 text-blue-500 flex flex-col items-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            <div className="text-[10px] font-black uppercase tracking-widest text-center leading-none">Payment</div>
                            <div className="text-xs font-bold uppercase">Stripe Verified</div>
                        </div>
                    </div>

                    {/* Manual Override (Only Global Mode) */}
                    {mode === 'global' && !hasDigitalWaiver && strictWaiverRequired && (
                        <div className="w-full mb-8 p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer group"
                             onClick={() => onWaiverOverride(player, !hasPhysicalWaiver)}>
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                    hasPhysicalWaiver ? "bg-pitch-accent border-pitch-accent" : "border-white/20 group-hover:border-white/40"
                                )}>
                                    {hasPhysicalWaiver && <X className="w-4 h-4 text-black" />}
                                </div>
                                <span className={cn(
                                    "text-xs font-bold uppercase transition-colors",
                                    hasPhysicalWaiver ? "text-white" : "text-gray-400"
                                )}>Manual Override: Paper Waiver Received</span>
                            </div>
                        </div>
                    )}

                    {/* Massive Action Button */}
                    <button
                        onClick={() => onCheckIn(player)}
                        disabled={isUpdating}
                        className={cn(
                            "w-full py-8 rounded-2xl text-2xl font-black uppercase tracking-widest transition-all relative overflow-hidden active:scale-95",
                            (mode === 'global' ? player.checked_in : player.is_match_checked_in)
                                ? "bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-black"
                                : "bg-pitch-accent text-black hover:scale-[1.02] shadow-[0_0_50px_rgba(204,255,0,0.2)]"
                        )}
                    >
                        {isUpdating ? (
                            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                        ) : (
                            (mode === 'global' ? player.checked_in : player.is_match_checked_in)
                                ? "Undo Check-In" 
                                : (mode === 'global' ? "Verify & Check-In" : "Check-In to Match")
                        )}
                    </button>
                    
                    {mode === 'global' && (
                        <p className="mt-4 text-[10px] text-gray-500 uppercase font-black tracking-widest">Master Roster Verification</p>
                    )}
                </div>
            </div>
        </div>
    );
}
