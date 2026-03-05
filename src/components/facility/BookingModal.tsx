'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Tag, User, Trash2, Edit2, CheckCircle2, XCircle, ChevronDown, Repeat } from 'lucide-react';
import { createBooking, updateBooking, deleteBooking, updateBookingStatus, createRecurringBooking, deleteRecurringSeries, approveContract } from '@/app/actions/facility';
import { format, parseISO, isBefore, isAfter, isEqual } from 'date-fns';
import { BookingEvent } from './FacilityCalendar';
import { useRouter } from 'next/navigation';

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedSlot?: { start: Date; end: Date; resourceId?: string } | null;
    selectedEvent?: BookingEvent | null;
    resources: { id: string; title: string; resource_type_id: string; resource_types?: { name: string } }[];
    existingBookings?: BookingEvent[]; // Passed down to power client-side collision detection
    onSuccess?: () => void;
}

export function BookingModal({ isOpen, onClose, selectedSlot, selectedEvent, resources, existingBookings = [], onSuccess }: BookingModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const router = useRouter();

    // If we have a selectedEvent, we default to preview mode (!isEditing)
    const [isEditing, setIsEditing] = useState(!selectedEvent);

    // Recurring state
    const [frequency, setFrequency] = useState<'none' | 'daily' | 'weekly' | 'bi-weekly'>('none');
    const [endCondition, setEndCondition] = useState<'date' | 'count'>('date');
    const [endDate, setEndDate] = useState<string>('');
    const [count, setCount] = useState<string>('4');

    const [validDates, setValidDates] = useState<{ start: Date, end: Date }[]>([]);
    const [conflictingDates, setConflictingDates] = useState<{ start: Date, end: Date }[]>([]);

    const [isDeleteMenuOpen, setIsDeleteMenuOpen] = useState(false);
    const deleteMenuRef = useRef<HTMLDivElement>(null);

    // Contract state
    const [contractPrice, setContractPrice] = useState<string>('');
    const [contractTerm, setContractTerm] = useState<'upfront' | 'weekly'>('weekly');
    const [isApprovingContract, setIsApprovingContract] = useState(false);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (deleteMenuRef.current && !deleteMenuRef.current.contains(event.target as Node)) {
                setIsDeleteMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const isEditMode = !!selectedEvent;

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true);
        setErrorMsg(null);

        const dateStr = formData.get('booking_date') as string;
        const startStr = formData.get('start_time_picker') as string;
        const endStr = formData.get('end_time_picker') as string;

        try {
            const fullStart = new Date(`${dateStr}T${startStr}:00`);
            const fullEnd = new Date(`${dateStr}T${endStr}:00`);
            const resourceId = formData.get('resource_id') as string;

            formData.set('start_time', fullStart.toISOString());
            formData.set('end_time', fullEnd.toISOString());

            // --- CLIENT SIDE PRE-CHECK (Recurring Only) ---
            if (frequency !== 'none' && !isEditMode) {
                formData.set('frequency', frequency);
                formData.set('end_condition', endCondition);
                if (endCondition === 'date') formData.set('end_date', endDate);
                if (endCondition === 'count') formData.set('count', count);

                const durationMs = fullEnd.getTime() - fullStart.getTime();
                const bookingDates: { start: Date, end: Date }[] = [];
                let currentDate = new Date(fullStart);
                let occurrences = 0;

                while (occurrences < 104) {
                    const currentEnd = new Date(currentDate.getTime() + durationMs);
                    bookingDates.push({ start: new Date(currentDate), end: new Date(currentEnd) });
                    occurrences++;

                    if (endCondition === 'count') {
                        if (occurrences >= (parseInt(count) || 1)) break;
                    } else {
                        const hardEndDate = new Date(endDate);
                        hardEndDate.setHours(23, 59, 59, 999);
                        let nextDate = new Date(currentDate);
                        if (frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
                        if (frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
                        if (frequency === 'bi-weekly') nextDate.setDate(nextDate.getDate() + 14);
                        if (nextDate > hardEndDate) break;
                    }

                    if (frequency === 'daily') currentDate.setDate(currentDate.getDate() + 1);
                    if (frequency === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
                    if (frequency === 'bi-weekly') currentDate.setDate(currentDate.getDate() + 14);
                }

                const valid: { start: Date, end: Date }[] = [];
                const conflicting: { start: Date, end: Date }[] = [];

                // Actually check the cache
                for (const proposed of bookingDates) {
                    const hasConflict = existingBookings.some(event => {
                        if (event.resourceId !== resourceId) return false;
                        if (event.status !== 'confirmed' && event.status !== 'pending' && event.status !== 'pending_facility_review') return false;

                        // Overlap logic: proposed starts before event ends AND proposed ends after event starts
                        return isBefore(proposed.start, event.end) && isAfter(proposed.end, event.start);
                    });

                    if (hasConflict) {
                        conflicting.push(proposed);
                    } else {
                        valid.push(proposed);
                    }
                }

                if (conflicting.length > 0 && validDates.length === 0) {
                    // First time discovering conflicts: Block submission & show warning UI
                    setConflictingDates(conflicting);
                    setValidDates(valid);
                    setIsSubmitting(false);
                    return; // Halt submission and wait for "Book Remaining"
                } else if (validDates.length > 0) {
                    // User clicked "Book Remaining", pass the valid ones to the server
                    formData.set('target_dates', JSON.stringify(validDates));
                } else {
                    // 100% clean sweep, no conflicts
                    formData.set('target_dates', JSON.stringify(valid));
                }
            }
            // --- END PRE-CHECK ---

            let result;
            if (isEditMode && selectedEvent) {
                result = await updateBooking(selectedEvent.id, formData);
            } else if (frequency !== 'none') {
                result = await createRecurringBooking(formData);
            } else {
                result = await createBooking(formData);
            }

            if (result.error) {
                setErrorMsg(result.error);
            } else {
                router.refresh();
                onSuccess?.();
                onClose();
            }
        } catch (err: any) {
            setErrorMsg("An unexpected error occurred. Please try again.");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete(isSeries: boolean = false) {
        if (!selectedEvent) return;

        const confirmMsg = isSeries
            ? 'Are you sure you want to delete this ENTIRE returning series? This cannot be undone.'
            : 'Are you sure you want to delete this specific booking?';

        if (!confirm(confirmMsg)) {
            setIsDeleteMenuOpen(false);
            return;
        }

        setIsDeleting(true);
        setIsDeleteMenuOpen(false);
        setErrorMsg(null);
        try {
            let result;
            if (isSeries && selectedEvent.recurringGroupId) {
                result = await deleteRecurringSeries(selectedEvent.recurringGroupId);
            } else {
                result = await deleteBooking(selectedEvent.id);
            }

            if (result.error) {
                setErrorMsg(result.error);
            } else {
                router.refresh();
                onSuccess?.();
                onClose();
            }
        } catch (err: any) {
            setErrorMsg("An unexpected error occurred. Please try again.");
            console.error(err);
        } finally {
            setIsDeleting(false);
        }
    }

    async function handleContractApproval() {
        if (!selectedEvent) return;
        setIsApprovingContract(true);
        setErrorMsg(null);

        try {
            const priceCents = contractPrice ? Math.round(parseFloat(contractPrice) * 100) : 0;
            const result = await approveContract(selectedEvent.id, priceCents, contractTerm);

            if (result.error) {
                setErrorMsg(result.error);
            } else {
                router.refresh();
                onClose();
            }
        } catch (err: any) {
            setErrorMsg("Failed to approve contract.");
        } finally {
            setIsApprovingContract(false);
        }
    }

    async function handleStatusUpdate(newStatus: string) {
        if (!selectedEvent) return;
        setIsUpdatingStatus(true);
        setErrorMsg(null);
        try {
            // For denial, we'll mark as cancelled so it frees up the slot.
            const statusToSet = newStatus === 'denied' ? 'cancelled' : newStatus;
            const result = await updateBookingStatus(selectedEvent.id, statusToSet);
            if (result.error) {
                setErrorMsg(result.error);
            } else {
                router.refresh();
                onClose();
            }
        } catch (err: any) {
            setErrorMsg("Failed to update status.");
        } finally {
            setIsUpdatingStatus(false);
        }
    }

    // Format initial values
    const targetDate = isEditMode && selectedEvent ? selectedEvent.start : selectedSlot!.start;
    const targetEnd = isEditMode && selectedEvent ? selectedEvent.end : selectedSlot!.end;

    let endToUse = targetEnd;
    if (!isEditMode && selectedSlot) {
        const durationMins = (targetEnd.getTime() - targetDate.getTime()) / 60000;
        if (durationMins <= 30) endToUse = new Date(targetDate.getTime() + 60 * 60000);
    }

    const defaultDate = format(targetDate, 'yyyy-MM-dd');
    const defaultStart = format(targetDate, 'HH:mm');
    const defaultEnd = format(endToUse, 'HH:mm');

    const defaultResource = isEditMode && selectedEvent ? selectedEvent.resourceId : selectedSlot?.resourceId;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-pitch-card border border-white/10 rounded-lg max-w-lg w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">

                <div className="p-6 border-b border-white/10 shrink-0 flex justify-between items-center">
                    <h3 className="text-2xl font-black italic uppercase text-white flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-pitch-accent" />
                        {!isEditing ? 'Booking Details' : (isEditMode ? 'Edit Booking' : 'New Booking')}
                    </h3>
                    <div className="flex items-center gap-4">
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded text-sm font-bold uppercase tracking-wider transition-colors"
                            >
                                <Edit2 className="w-4 h-4" /> Edit
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto form-scrollbar flex-1">
                    {errorMsg && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm font-medium flex items-start gap-2">
                            <div className="mt-0.5">⚠️</div>
                            {errorMsg}
                        </div>
                    )}

                    {!isEditing ? (
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Description</label>
                                <div className="text-xl font-bold text-white flex items-center gap-3">
                                    {selectedEvent?.title}
                                    {selectedEvent?.status === 'pending_facility_review' && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/50">
                                            Pending Review
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Resource / Location</label>
                                <div className="text-lg text-white">
                                    {resources.find(r => r.id === selectedEvent?.resourceId)?.title || 'Unknown'}
                                </div>
                            </div>

                            {selectedEvent?.renterName && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Renter Name</label>
                                    <div className="text-lg text-white">{selectedEvent.renterName}</div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date</label>
                                    <div className="text-white font-medium">{format(targetDate, 'EEEE, MMMM do yyyy')}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Time</label>
                                    <div className="text-white font-medium">{format(targetDate, 'h:mm a')} - {format(targetEnd, 'h:mm a')}</div>
                                </div>
                            </div>

                            {selectedEvent?.status === 'pending_contract' && (
                                <div className="mt-6 pt-6 border-t border-white/10 space-y-5 animate-in slide-in-from-bottom-2">
                                    <h4 className="text-yellow-400 font-bold uppercase tracking-wider flex items-center gap-2 text-sm">
                                        <Tag className="w-4 h-4" /> Review Contract
                                    </h4>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Invoice Amount ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={contractPrice}
                                            onChange={(e) => setContractPrice(e.target.value)}
                                            placeholder="e.g. 500.00"
                                            className="w-full bg-black/50 border border-yellow-500/30 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors"
                                        />
                                        <p className="text-xs text-gray-500 mt-1 pb-1">Enter the final negotiated price for this entire contract request.</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Payment Terms</label>
                                        <select
                                            value={contractTerm}
                                            onChange={(e) => setContractTerm(e.target.value as 'upfront' | 'weekly')}
                                            className="w-full bg-black/50 border border-yellow-500/30 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors appearance-none"
                                        >
                                            <option value="upfront">Upfront (User Pays 100% Now)</option>
                                            <option value="weekly">Weekly Auto-Pay (Charge 1st Installment & Save Card)</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <form id="booking-form" action={handleSubmit} className="space-y-5">

                            {/* Event Title */}
                            <div className="space-y-1.5">
                                <label htmlFor="title" className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                    <Tag className="w-4 h-4" /> Description
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    required
                                    defaultValue={isEditMode && selectedEvent ? selectedEvent.title : ''}
                                    placeholder="e.g. U12 Practice / Adult Pickup"
                                    className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                />
                            </div>

                            {/* Resource Selection */}
                            <div className="space-y-1.5">
                                <label htmlFor="resource_id" className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-400" /> Location / Resource
                                </label>
                                <select
                                    id="resource_id"
                                    name="resource_id"
                                    required
                                    defaultValue={defaultResource || ''}
                                    className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors appearance-none"
                                >
                                    <option value="" disabled>Select a field or court...</option>
                                    {resources.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.title} {r.resource_types?.name ? `(${r.resource_types.name})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Renter (Optional) */}
                            <div className="space-y-1.5">
                                <label htmlFor="renter_name" className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                    <User className="w-4 h-4 text-purple-400" /> Renter Name <span className="text-gray-600 font-normal italic lowercase ml-1">(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    id="renter_name"
                                    name="renter_name"
                                    defaultValue={isEditMode && selectedEvent ? selectedEvent.renterName : ''}
                                    placeholder="e.g. John Doe / Elmwood FC"
                                    className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 col-span-2">
                                    <label htmlFor="booking_date" className="text-sm font-bold uppercase tracking-wider text-gray-400">Date</label>
                                    <input
                                        type="date"
                                        id="booking_date"
                                        name="booking_date"
                                        required
                                        defaultValue={defaultDate}
                                        className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="start_time_picker" className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-green-400" /> Start Time
                                    </label>
                                    <input
                                        type="time"
                                        id="start_time_picker"
                                        name="start_time_picker"
                                        required
                                        defaultValue={defaultStart}
                                        className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="end_time_picker" className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-red-400" /> End Time
                                    </label>
                                    <input
                                        type="time"
                                        id="end_time_picker"
                                        name="end_time_picker"
                                        required
                                        defaultValue={defaultEnd}
                                        className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Recurring Booking Block (Only visible on New Bookings) */}
                            {!isEditMode && (
                                <div className="pt-4 border-t border-white/5 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Repeat</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(['none', 'daily', 'weekly', 'bi-weekly'] as const).map(f => (
                                                <button
                                                    key={f}
                                                    type="button"
                                                    onClick={() => setFrequency(f)}
                                                    className={`py-2 text-xs font-bold uppercase tracking-wider rounded-sm border transition-colors ${frequency === f
                                                        ? 'bg-pitch-accent/20 text-pitch-accent border-pitch-accent'
                                                        : 'bg-black/40 text-gray-400 border-white/10 hover:border-white/30'
                                                        }`}
                                                >
                                                    {f}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {frequency !== 'none' && (
                                        <div className="bg-black/40 border border-white/5 rounded-sm p-4 animate-in slide-in-from-top-2 duration-200">
                                            <div className="flex gap-6 mb-4">
                                                <label className="flex items-center gap-2 text-sm text-gray-300 font-bold uppercase cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        checked={endCondition === 'date'}
                                                        onChange={() => setEndCondition('date')}
                                                        className="accent-pitch-accent"
                                                    />
                                                    End by Date
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-gray-300 font-bold uppercase cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        checked={endCondition === 'count'}
                                                        onChange={() => setEndCondition('count')}
                                                        className="accent-pitch-accent"
                                                    />
                                                    After Occurrences
                                                </label>
                                            </div>

                                            {endCondition === 'date' ? (
                                                <input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    required={endCondition === 'date'}
                                                    className="w-full bg-black/60 border border-white/10 rounded-sm px-4 py-2 text-white text-sm focus:outline-none focus:border-pitch-accent"
                                                />
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="52"
                                                        value={count}
                                                        onChange={(e) => setCount(e.target.value)}
                                                        required={endCondition === 'count'}
                                                        className="w-24 bg-black/60 border border-white/10 rounded-sm px-4 py-2 text-white text-sm focus:outline-none focus:border-pitch-accent"
                                                    />
                                                    <span className="text-sm font-bold uppercase text-gray-500">Events Total</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SMART CONFLICT SKIPPER WARNING */}
                            {conflictingDates.length > 0 && (
                                <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded text-orange-400 text-sm animate-in slide-in-from-top-2 duration-200">
                                    <h4 className="font-bold flex items-center gap-2 mb-2">
                                        <div className="mt-0.5">⚠️</div>
                                        Conflict Detected
                                    </h4>
                                    <p className="mb-3 text-orange-400/80">
                                        The following dates in your series overlap with existing bookings. Do you want to skip these and book the remaining {validDates.length} dates?
                                    </p>
                                    <ul className="list-disc pl-5 space-y-1 text-xs font-medium text-orange-300/80">
                                        {conflictingDates.map((d, i) => (
                                            <li key={i}>{format(d.start, 'MMM do, yyyy @ h:mm a')}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                        </form>
                    )}
                </div>

                {/* Pinned Footer Actions */}
                <div className="p-6 pb-8 border-t border-white/10 shrink-0 bg-pitch-card">
                    {!isEditing ? (
                        <div className="flex justify-end gap-3">
                            {selectedEvent?.status === 'pending_contract' ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => handleStatusUpdate('cancelled')}
                                        disabled={isApprovingContract || isUpdatingStatus}
                                        className="px-4 py-3 flex items-center gap-2 font-bold uppercase tracking-wider text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 transition-colors rounded-sm text-xs focus:outline-none disabled:opacity-50"
                                    >
                                        <XCircle className="w-4 h-4" /> Decline
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleContractApproval}
                                        disabled={isApprovingContract || isUpdatingStatus}
                                        className="px-5 py-3 flex items-center gap-2 font-bold uppercase tracking-wider text-black bg-yellow-500 hover:bg-yellow-400 transition-all rounded-sm text-xs shadow-lg focus:outline-none disabled:opacity-50"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> {isApprovingContract ? 'Sending...' : 'Approve & Invoice'}
                                    </button>
                                </>
                            ) : selectedEvent?.status === 'pending_facility_review' && selectedEvent?.renterName === 'PitchSide HQ' ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => handleStatusUpdate('cancelled')}
                                        disabled={isUpdatingStatus}
                                        className="px-4 py-3 flex items-center gap-2 font-bold uppercase tracking-wider text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 transition-colors rounded-sm text-xs focus:outline-none disabled:opacity-50"
                                    >
                                        <XCircle className="w-4 h-4" /> Deny
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleStatusUpdate('confirmed')}
                                        disabled={isUpdatingStatus}
                                        className="px-5 py-3 flex items-center gap-2 font-bold uppercase tracking-wider text-black bg-pitch-accent hover:bg-pitch-accent/90 transition-all rounded-sm text-xs shadow-lg focus:outline-none disabled:opacity-50"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Approve
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-3 font-bold uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 transition-colors rounded-sm text-sm"
                                >
                                    Close
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex gap-3 justify-between items-center w-full">
                            <div className="relative" ref={deleteMenuRef}>
                                {isEditMode && (
                                    selectedEvent?.recurringGroupId ? (
                                        isDeleteMenuOpen ? (
                                            <div className="flex bg-black/50 p-1.5 rounded-md border border-red-500/20 shadow-inner animate-in fade-in slide-in-from-left-2 items-stretch min-h-[44px]">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(false)}
                                                    className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-300 hover:bg-white/10 transition-colors rounded-sm flex items-center justify-center flex-1"
                                                >
                                                    Just This
                                                </button>
                                                <div className="w-px bg-white/10 mx-1"></div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(true)}
                                                    className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-500 hover:bg-red-500 hover:text-white transition-colors rounded-sm flex items-center justify-center flex-1"
                                                >
                                                    <Repeat className="w-3 h-3 mr-1" />
                                                    Series
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsDeleteMenuOpen(false)}
                                                    className="px-2 text-gray-500 hover:text-white transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setIsDeleteMenuOpen(true)}
                                                disabled={isDeleting}
                                                className="px-4 py-3 font-bold uppercase tracking-wider text-red-500 hover:text-white hover:bg-red-500/20 rounded-sm transition-colors flex items-center gap-2 text-sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                {isDeleting ? 'Deleting...' : 'Delete'}
                                                <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
                                            </button>
                                        )
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(false)}
                                            disabled={isDeleting}
                                            className="px-4 py-3 font-bold uppercase tracking-wider text-red-500 hover:text-white hover:bg-red-500/20 rounded transition-colors flex items-center gap-2 text-sm"
                                        >
                                            <Trash2 className="w-4 h-4" /> {isDeleting ? 'Deleting...' : 'Delete'}
                                        </button>
                                    )
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isEditMode) {
                                            setIsEditing(false); // go back to preview
                                        } else {
                                            onClose();
                                        }
                                    }}
                                    className="px-6 py-3 font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="booking-form"
                                    disabled={isSubmitting || isDeleting || (conflictingDates.length > 0 && validDates.length === 0)}
                                    className={`font-bold uppercase tracking-wider px-8 py-3 rounded-sm transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:-translate-y-0 text-sm ${conflictingDates.length > 0
                                        ? 'bg-orange-500 hover:bg-orange-400 text-black'
                                        : 'bg-pitch-accent text-pitch-black hover:bg-pitch-accent/90'
                                        }`}
                                >
                                    {isSubmitting
                                        ? 'Saving...'
                                        : (conflictingDates.length > 0
                                            ? `Book Remaining ${validDates.length}`
                                            : (isEditMode ? 'Update' : 'Lock')
                                        )
                                    }
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
