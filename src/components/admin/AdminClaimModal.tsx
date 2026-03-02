'use client';

import { X, CalendarDays, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { claimMarketplaceSlot } from '@/app/actions/admin-marketplace';
import { useState } from 'react';

interface AdminClaimModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedSlot: {
        start: Date;
        end: Date;
        resourceId?: string;
    } | null;
    resources: any[];
    facilityName: string;
    facilityId: string;
    onSuccess: () => void;
}

export function AdminClaimModal({
    isOpen,
    onClose,
    selectedSlot,
    resources,
    facilityName,
    facilityId,
    onSuccess
}: AdminClaimModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [bookingType, setBookingType] = useState('confirmed');

    if (!isOpen || !selectedSlot) return null;

    const resource = resources.find(r => r.id === selectedSlot.resourceId);

    async function handleClaim() {
        if (!selectedSlot || !selectedSlot.resourceId) return;

        setIsSubmitting(true);
        setError(null);

        const formData = new FormData();
        formData.append('facility_id', facilityId);
        formData.append('resource_id', selectedSlot.resourceId);
        formData.append('start_time', selectedSlot.start.toISOString());
        formData.append('end_time', selectedSlot.end.toISOString());
        formData.append('status', bookingType);

        const result = await claimMarketplaceSlot(formData);

        if (result.error) {
            setError(result.error);
            setIsSubmitting(false);
        } else {
            setIsSubmitting(false);
            onSuccess();
            onClose();
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-pitch-card border border-white/10 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div>
                        <h2 className="text-2xl font-heading font-black uppercase tracking-tight text-white">Claim Marketplace Slot</h2>
                        <p className="text-gray-400 text-sm mt-1">Book this facility time exclusively for PitchSide</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg"
                        disabled={isSubmitting}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Details Card */}
                    <div className="bg-black/40 border border-white/10 rounded-lg p-5 space-y-4">
                        <div className="flex items-center gap-3 text-white">
                            <MapPin className="w-5 h-5 text-pitch-accent shrink-0" />
                            <div>
                                <div className="font-bold">{facilityName}</div>
                                <div className="text-sm text-gray-400">{resource?.title || 'Unknown Resource'}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                            <div className="flex items-start gap-3 text-white">
                                <CalendarDays className="w-5 h-5 text-blue-400 shrink-0" />
                                <div>
                                    <div className="text-xs uppercase font-bold text-gray-500 tracking-wider">Date</div>
                                    <div className="font-bold">{format(selectedSlot.start, 'MMM do, yyyy')}</div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 text-white">
                                <Clock className="w-5 h-5 text-purple-400 shrink-0" />
                                <div>
                                    <div className="text-xs uppercase font-bold text-gray-500 tracking-wider">Time</div>
                                    <div className="font-bold">
                                        {format(selectedSlot.start, 'h:mm a')} - {format(selectedSlot.end, 'h:mm a')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Booking Type Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Booking Type</label>
                        <select
                            value={bookingType}
                            onChange={(e) => setBookingType(e.target.value)}
                            className="w-full bg-black border border-white/20 rounded-md py-3 px-4 text-white font-medium appearance-none hover:border-white/40 focus:outline-none focus:border-pitch-accent transition-colors"
                        >
                            <option value="confirmed">Contract Claim (Confirmed)</option>
                            <option value="pending">Ad-Hoc Request (Pending)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            {bookingType === 'confirmed'
                                ? 'Instantly books the slot as part of a pre-existing facility contract.'
                                : 'Submits a pending request to the facility for approval outside of contract terms.'}
                        </p>
                    </div>

                    {error && (
                        <div className="px-4 py-3 rounded-md bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-bold flex items-center justify-center animate-pulse">
                            {error}
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={handleClaim}
                            disabled={isSubmitting}
                            className={`w-full bg-pitch-accent hover:bg-pitch-accent/90 text-black py-4 rounded-lg font-bold uppercase tracking-wider text-sm transition-all focus:outline-none flex justify-center items-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                        >
                            {isSubmitting ? 'Claiming Slot...' : 'Confirm PitchSide Booking'}
                        </button>
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="w-full bg-transparent hover:bg-white/5 text-gray-400 py-3 rounded-lg font-bold uppercase tracking-wider text-xs transition-colors focus:outline-none"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
