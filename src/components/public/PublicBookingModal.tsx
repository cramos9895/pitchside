'use client';

import { useState } from 'react';
import { X, Calendar, MapPin, Clock, Info } from 'lucide-react';
import { submitBookingRequest, executeFreePromoBooking } from '@/app/actions/public-booking';
import { createCheckoutSession } from '@/app/actions/stripe';
import { validatePromoCode } from '@/app/actions/payments';
import { WaiverModal } from '../WaiverModal';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface FacilityResource {
    id: string;
    title: string;
    resource_types?: { name: string; default_hourly_rate?: number };
}

interface PublicBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedSlot: { start: Date; end: Date; resourceId?: string } | null;
    resources: FacilityResource[];
    facilityId: string;
    facilityName: string;
    isAuthenticated: boolean;
}

export function PublicBookingModal({
    isOpen,
    onClose,
    selectedSlot,
    resources,
    facilityId,
    facilityName,
    isAuthenticated
}: PublicBookingModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [title, setTitle] = useState('');
    const [email, setEmail] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [promoCode, setPromoCode] = useState('');
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<{ id: string; discount_type: string; discount_value: number; code: string } | null>(null);
    const [promoError, setPromoError] = useState<string | null>(null);

    const [showWaiver, setShowWaiver] = useState(false);
    const [agreeingWaiver, setAgreeingWaiver] = useState(false);
    const [facilityWaiverText, setFacilityWaiverText] = useState<string | null>(null);
    const supabase = createClient();

    if (!isOpen || !selectedSlot) return null;

    const resource = resources.find(r => r.id === selectedSlot.resourceId);
    if (!resource) return null;

    const rate = resource.resource_types?.default_hourly_rate || 0;
    const durationHours = (selectedSlot.end.getTime() - selectedSlot.start.getTime()) / (1000 * 60 * 60);
    const estimatedCost = rate * durationHours;

    let discountAmount = 0;
    if (appliedPromo) {
        if (appliedPromo.discount_type === 'percentage') {
            discountAmount = estimatedCost * (appliedPromo.discount_value / 100);
        } else if (appliedPromo.discount_type === 'fixed_amount') {
            // Fixed amount is in cents
            discountAmount = appliedPromo.discount_value / 100;
        }
    }
    const finalCost = Math.max(0, estimatedCost - discountAmount);

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) return;
        setIsApplyingPromo(true);
        setPromoError(null);

        const result = await validatePromoCode(promoCode.trim(), facilityId);

        if (result.error) {
            setPromoError(result.error);
            setAppliedPromo(null);
        } else if (result.promo) {
            setAppliedPromo(result.promo);
            setPromoCode('');
        }

        setIsApplyingPromo(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            // 1. Check if facility even requires a waiver
            const { data: facilityData } = await supabase
                .from('facilities')
                .select('waiver_text')
                .eq('id', facilityId)
                .single();

            const requiredWaiverText = facilityData?.waiver_text?.trim();

            if (requiredWaiverText) {
                // 1b. Check if user already signed this facility's waiver
                const { data: userData } = await supabase.auth.getUser();
                if (userData.user) {
                    const { data: signature } = await supabase
                        .from('waiver_signatures')
                        .select('id')
                        .eq('user_id', userData.user.id)
                        .eq('facility_id', facilityId)
                        .maybeSingle();

                    if (!signature) {
                        setFacilityWaiverText(requiredWaiverText);
                        setIsSubmitting(false);
                        setShowWaiver(true);
                        return; // Pause flow
                    }
                }
            }

            // 2. Proceed with Booking
            await executeBooking();
        } catch (error) {
            setErrorMsg('An unexpected error occurred verifying your signature.');
            setIsSubmitting(false);
        }
    };

    const handleWaiverAgree = async () => {
        setAgreeingWaiver(true);
        const { data: userData } = await supabase.auth.getUser();

        if (userData.user) {
            await supabase
                .from('waiver_signatures')
                .insert({ user_id: userData.user.id, facility_id: facilityId });

            setShowWaiver(false);

            // Resume flow
            setIsSubmitting(true);
            await executeBooking();
        }
        setAgreeingWaiver(false);
    };

    const isContractRequest = finalCost >= 500;

    const executeBooking = async () => {
        try {
            if (isContractRequest) {
                // High-value carts bypass Stripe and generate a Contract Request
                const result = await submitBookingRequest({
                    facilityId,
                    resourceId: resource.id,
                    title,
                    contactEmail: email,
                    startTime: selectedSlot.start.toISOString(),
                    endTime: selectedSlot.end.toISOString(),
                    isContractRequest: true
                });

                if (result.success) {
                    setSuccessMsg('Contract Request Submitted! The facility will review your request and send an invoice shortly.');
                    setTimeout(() => {
                        onClose();
                        setSuccessMsg(null);
                        setTitle('');
                        setEmail('');
                    }, 4000);
                } else {
                    setErrorMsg(result.error || 'Failed to submit contract request.');
                }
            } else if (finalCost > 0) {
                // Standard Paid Cart
                const amountCents = Math.round(finalCost * 100);
                const result = await createCheckoutSession({
                    facilityId,
                    resourceId: resource.id,
                    title,
                    contactEmail: email,
                    startTime: selectedSlot.start.toISOString(),
                    endTime: selectedSlot.end.toISOString(),
                    amountCents,
                    promoCodeId: appliedPromo?.id
                });

                if (result.url) {
                    window.location.href = result.url; // Send to Stripe
                    return;
                } else {
                    setErrorMsg(result.error || 'Failed to initiate checkout.');
                }
            } else if (rate > 0 && finalCost === 0 && appliedPromo?.id) {
                // $0 Cart Bypass
                const result = await executeFreePromoBooking({
                    facilityId,
                    resourceId: resource.id,
                    title,
                    contactEmail: email,
                    startTime: selectedSlot.start.toISOString(),
                    endTime: selectedSlot.end.toISOString(),
                    promoCodeId: appliedPromo.id
                });

                if (result.success) {
                    setSuccessMsg('Booking Confirmed! Your promo code covered the full amount.');
                    setTimeout(() => {
                        onClose();
                        window.location.href = `/dashboard`;
                    }, 2000);
                } else {
                    setErrorMsg(result.error || 'Failed to process free booking.');
                }
            } else {
                // Free Booking Request ($0)
                const result = await submitBookingRequest({
                    facilityId,
                    resourceId: resource.id,
                    title,
                    contactEmail: email,
                    startTime: selectedSlot.start.toISOString(),
                    endTime: selectedSlot.end.toISOString()
                });

                if (result.success) {
                    setSuccessMsg('Your booking request has been submitted! The facility will review it shortly.');
                    setTimeout(() => {
                        onClose();
                        setSuccessMsg(null);
                        setTitle('');
                        setEmail('');
                    }, 3000);
                } else {
                    setErrorMsg(result.error || 'Failed to submit request.');
                }
            }
        } catch (error) {
            setErrorMsg('An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header - SHRINK 0 */}
                <div className="bg-slate-800 p-6 flex items-start justify-between border-b border-white/5 shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pitch-accent to-blue-500"></div>
                    <div>
                        <h2 className="text-xl font-heading font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                            {isContractRequest ? 'Request Contract' : 'Request Booking'}
                        </h2>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                            <MapPin className="w-4 h-4 text-pitch-accent" />
                            <span>{facilityName}</span>
                            <span className="text-white/20 px-1">•</span>
                            <span className="font-medium text-gray-300">{resource.title}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body - SCROLLS */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Time Summary */}
                    <div className="bg-black/40 border border-white/5 rounded-lg p-5 mb-6 flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-white">
                            <div className="bg-pitch-accent/20 p-2 rounded-md">
                                <Calendar className="w-5 h-5 text-pitch-accent" />
                            </div>
                            <div>
                                <div className="text-sm text-gray-400 font-bold uppercase tracking-wider">Date</div>
                                <div className="font-medium">
                                    {selectedSlot.start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-white">
                            <div className="bg-blue-500/20 p-2 rounded-md">
                                <Clock className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <div className="text-sm text-gray-400 font-bold uppercase tracking-wider">Time</div>
                                <div className="font-medium">
                                    {selectedSlot.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {selectedSlot.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                        {rate > 0 && (
                            <div className="mt-2 pt-3 border-t border-white/5 flex flex-col gap-1 text-sm">
                                <div className="flex justify-between items-center text-lg mt-2">
                                    <span className="text-white font-bold">Total Cost</span>
                                    <div className="flex items-center gap-2">
                                        {appliedPromo && (
                                            <span className="text-gray-500 line-through text-sm">${estimatedCost.toFixed(2)}</span>
                                        )}
                                        <span className={`font-black font-numeric ${isContractRequest ? 'text-yellow-400' : 'text-pitch-accent'}`}>
                                            ${finalCost.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                {isContractRequest && finalCost > 0 && (
                                    <span className="text-xs text-yellow-500/80 italic text-right mt-1">
                                        High-value cart. Payment collected via invoice.
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {!isAuthenticated ? (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 text-center space-y-4">
                            <Info className="w-8 h-8 text-blue-400 mx-auto" />
                            <div className="text-gray-300 text-sm leading-relaxed">
                                You must be logged into PitchSide to request a slot at this facility. Sign in or create a quick free account to continue.
                            </div>
                        </div>
                    ) : successMsg ? (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-6 rounded-lg text-center font-medium animate-in fade-in">
                            {successMsg}
                        </div>
                    ) : (
                        <form id="public-form" onSubmit={handleSubmit} className="space-y-5">
                            {errorMsg && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-sm text-center">
                                    {errorMsg}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">
                                    Request Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. U12 Team Practice, Johnny's Birthday"
                                    className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">
                                    Contact Email (For Facility)
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                />
                                <p className="text-xs text-gray-500 mt-2">The facility will use this to contact you if approved.</p>
                            </div>
                        </form>
                    )}

                    {isAuthenticated && !successMsg && rate > 0 && (
                        <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                            <label className="block text-sm font-bold uppercase tracking-wider text-gray-400">Promo Code</label>

                            {appliedPromo ? (
                                <div className="flex items-center justify-between bg-pitch-accent/10 border border-pitch-accent/30 rounded px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-pitch-accent animate-pulse"></div>
                                        <span className="text-pitch-accent font-bold uppercase tracking-widest text-sm">{appliedPromo.code}</span>
                                        <span className="text-white text-xs ml-2 border-l border-white/20 pl-2">
                                            {appliedPromo.discount_type === 'percentage' ? `${appliedPromo.discount_value}% OFF` : `$${(appliedPromo.discount_value / 100).toFixed(2)} OFF`}
                                        </span>
                                    </div>
                                    <button onClick={() => setAppliedPromo(null)} className="text-gray-400 hover:text-white transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter code"
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                        className="flex-1 bg-black/50 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-pitch-accent uppercase placeholder:normal-case font-bold"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleApplyPromo}
                                        disabled={!promoCode || isApplyingPromo}
                                        className="bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider px-6 rounded transition-colors disabled:opacity-50"
                                    >
                                        Apply
                                    </button>
                                </div>
                            )}

                            {promoError && <p className="text-red-400 text-xs font-medium">{promoError}</p>}
                        </div>
                    )}
                </div>

                {/* Footer - Pinned Bottom */}
                <div className="p-4 border-t border-white/5 bg-slate-800/50 shrink-0">
                    {!isAuthenticated ? (
                        <Link
                            href="/login"
                            className="flex items-center justify-center bg-pitch-accent text-pitch-black font-bold uppercase w-full py-3 rounded-sm transition-transform hover:-translate-y-0.5"
                        >
                            Login to Request
                        </Link>
                    ) : successMsg ? (
                        <button
                            onClick={onClose}
                            className="w-full font-bold uppercase tracking-wider py-3 rounded text-sm transition-all shadow-lg hover:-translate-y-0.5 bg-white text-pitch-black"
                        >
                            Close
                        </button>
                    ) : (
                        <button
                            type="submit"
                            form="public-form"
                            disabled={isSubmitting}
                            className={`w-full font-bold uppercase tracking-wider py-3 rounded text-sm transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:-translate-y-0 
                                ${isContractRequest
                                    ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                                    : rate > 0 ? 'bg-pitch-accent text-pitch-black hover:bg-white' : 'bg-white text-pitch-black hover:bg-gray-200'}
                            `}
                        >
                            {isSubmitting
                                ? (isContractRequest ? 'Sending Request...' : rate > 0 ? 'Redirecting...' : 'Submitting...')
                                : (isContractRequest ? `Request Contract ($${finalCost.toFixed(2)})` : finalCost > 0 ? `Proceed to Payment ($${finalCost.toFixed(2)})` : 'Submit Request')
                            }
                        </button>
                    )}
                </div>
            </div>

            <WaiverModal
                isOpen={showWaiver}
                onClose={() => setShowWaiver(false)}
                onAgree={handleWaiverAgree}
                loading={agreeingWaiver}
                facilityId={facilityId}
                customText={facilityWaiverText || undefined}
            />
        </div>
    );
}
