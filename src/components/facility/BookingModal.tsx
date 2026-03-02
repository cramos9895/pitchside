'use client';

import { useState } from 'react';
import { X, Calendar, Clock, MapPin, Tag, User, Trash2, Edit2, CheckCircle2, XCircle } from 'lucide-react';
import { createBooking, updateBooking, deleteBooking, updateBookingStatus } from '@/app/actions/facility';
import { format } from 'date-fns';
import { BookingEvent } from './FacilityCalendar';
import { useRouter } from 'next/navigation';

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedSlot?: { start: Date; end: Date; resourceId?: string } | null;
    selectedEvent?: BookingEvent | null;
    resources: { id: string; title: string; resource_type_id: string; resource_types?: { name: string } }[];
}

export function BookingModal({ isOpen, onClose, selectedSlot, selectedEvent, resources }: BookingModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const router = useRouter();

    // If we have a selectedEvent, we default to preview mode (!isEditing)
    const [isEditing, setIsEditing] = useState(!selectedEvent);

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

            formData.set('start_time', fullStart.toISOString());
            formData.set('end_time', fullEnd.toISOString());

            const result = isEditMode && selectedEvent
                ? await updateBooking(selectedEvent.id, formData)
                : await createBooking(formData);

            if (result.error) {
                setErrorMsg(result.error);
            } else {
                router.refresh();
                onClose();
            }
        } catch (err: any) {
            setErrorMsg("An unexpected error occurred. Please try again.");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!selectedEvent) return;
        if (!confirm('Are you sure you want to delete this booking?')) return;

        setIsDeleting(true);
        setErrorMsg(null);
        try {
            const result = await deleteBooking(selectedEvent.id);
            if (result.error) {
                setErrorMsg(result.error);
            } else {
                router.refresh();
                onClose();
            }
        } catch (err: any) {
            setErrorMsg("Failed to delete booking.");
        } finally {
            setIsDeleting(false);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-pitch-card border border-white/10 p-8 rounded-lg max-w-lg w-full shadow-2xl relative">

                <div className="mb-6 flex justify-between items-center border-b border-white/10 pb-3">
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

                        <div className="pt-4 border-t border-white/5 flex gap-3 justify-end items-center mt-2">
                            {selectedEvent?.status === 'pending_facility_review' && selectedEvent?.renterName === 'PitchSide HQ' ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => handleStatusUpdate('cancelled')}
                                        disabled={isUpdatingStatus}
                                        className="px-4 py-2 flex items-center gap-2 font-bold uppercase tracking-wider text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 transition-colors rounded-sm text-xs focus:outline-none disabled:opacity-50"
                                    >
                                        <XCircle className="w-4 h-4" /> Deny Request
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleStatusUpdate('confirmed')}
                                        disabled={isUpdatingStatus}
                                        className="px-5 py-2 flex items-center gap-2 font-bold uppercase tracking-wider text-black bg-pitch-accent hover:bg-pitch-accent/90 transition-all rounded-sm text-xs shadow-lg focus:outline-none disabled:opacity-50"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Approve Claim
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-3 font-bold uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 transition-colors rounded-sm text-sm"
                                >
                                    Close Preview
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <form action={handleSubmit} className="space-y-5">

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

                        <div className="pt-4 border-t border-white/5 flex gap-3 justify-between items-center mt-2">
                            <div>
                                {isEditMode && (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="px-4 py-2 font-bold uppercase tracking-wider text-red-500 hover:text-white hover:bg-red-500/20 rounded transition-colors flex items-center gap-2 text-sm"
                                    >
                                        <Trash2 className="w-4 h-4" /> {isDeleting ? 'Deleting...' : 'Delete'}
                                    </button>
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
                                    disabled={isSubmitting || isDeleting}
                                    className="bg-pitch-accent text-pitch-black font-bold uppercase tracking-wider px-8 py-3 rounded-sm transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:-translate-y-0 text-sm"
                                >
                                    {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Booking' : 'Lock Booking')}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
