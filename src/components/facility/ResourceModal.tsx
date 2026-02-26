'use client';

import { useState, useRef } from 'react';
import { Plus, Loader2, X } from 'lucide-react';
import { createResource } from '@/app/actions/facility';
import { useToast } from '@/components/ui/Toast';

interface ResourceModalProps {
    isSuperAdmin?: boolean;
    facilities?: { id: string; name: string }[];
    activityTypes?: any[];
}

export function ResourceModal({ isSuperAdmin, facilities, activityTypes }: ResourceModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const { success, error } = useToast();
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = async (formData: FormData) => {
        setIsPending(true);
        try {
            const result = await createResource(formData);

            if (result.error) {
                error(result.error);
            } else if (result.success) {
                success('Resource successfully created!');
                setIsOpen(false);
                formRef.current?.reset();
            }
        } catch (err: any) {
            error(err.message || 'An unexpected error occurred.');
        } finally {
            setIsPending(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-pitch-accent text-pitch-black px-6 py-3 rounded-sm font-black uppercase tracking-wider hover:bg-white transition-colors"
            >
                <Plus className="w-5 h-5" />
                Add Resource
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-neutral-900 border border-white/10 w-full max-w-md rounded-sm shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
                            <h3 className="font-heading text-2xl font-bold italic uppercase tracking-wider text-white">
                                New <span className="text-pitch-accent">Resource</span>
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                                disabled={isPending}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form ref={formRef} action={handleSubmit} className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="name" className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Resource Name
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    placeholder="e.g. Turf Field 1"
                                    disabled={isPending}
                                    className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-pitch-accent focus:ring-1 focus:ring-pitch-accent transition-all"
                                />
                            </div>

                            {isSuperAdmin && (
                                <div className="space-y-2">
                                    <label htmlFor="facility_id" className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        Assign to Facility
                                    </label>
                                    <select
                                        id="facility_id"
                                        name="facility_id"
                                        required
                                        disabled={isPending || !facilities || facilities.length === 0}
                                        defaultValue=""
                                        className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent focus:ring-1 focus:ring-pitch-accent transition-all appearance-none"
                                    >
                                        <option value="" disabled className="text-gray-500">
                                            {!facilities || facilities.length === 0 ? 'No facilities found! Create one first.' : 'Select a facility...'}
                                        </option>
                                        {facilities && facilities.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label htmlFor="type" className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Resource Type
                                </label>
                                <select
                                    id="type"
                                    name="type"
                                    required
                                    disabled={isPending || !activityTypes || activityTypes.length === 0}
                                    defaultValue=""
                                    className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent focus:ring-1 focus:ring-pitch-accent transition-all appearance-none"
                                >
                                    <option value="" disabled className="text-gray-500">
                                        {!activityTypes || activityTypes.length === 0 ? 'No activities found! Create one in Settings.' : 'Select an activity type...'}
                                    </option>
                                    {activityTypes && activityTypes.map(act => (
                                        <option key={act.id} value={act.name}>{act.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    disabled={isPending}
                                    className="flex-1 py-3 text-gray-400 font-bold uppercase tracking-wider hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="flex-[2] flex items-center justify-center gap-2 py-3 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Create Resource'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
