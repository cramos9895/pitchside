'use client';

import { useState, useRef } from 'react';
import { Plus, Loader2, X, Check, ChevronDown } from 'lucide-react';
import { createResource } from '@/app/actions/facility';
import { useToast } from '@/components/ui/Toast';

interface ResourceModalProps {
    isSuperAdmin?: boolean;
    facilities?: { id: string; name: string }[];
    resourceTypes?: { id: string; name: string }[];
    activityTypes?: { id: string; name: string; color_code: string }[];
}

export function ResourceModal({ isSuperAdmin, facilities, resourceTypes, activityTypes }: ResourceModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
    const [isActivitiesOpen, setIsActivitiesOpen] = useState(false);

    const { success, error } = useToast();
    const formRef = useRef<HTMLFormElement>(null);

    const toggleActivity = (id: string) => {
        const newSet = new Set(selectedActivities);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedActivities(newSet);
    };

    const handleSubmit = async (formData: FormData) => {
        if (selectedActivities.size === 0) {
            error('Please select at least one activity type.');
            return;
        }

        setIsPending(true);
        // Inject the selected activities as a JSON string
        formData.append('activity_ids', JSON.stringify(Array.from(selectedActivities)));

        try {
            const result = await createResource(formData);

            if (result.error) {
                error(result.error);
            } else if (result.success) {
                success('Resource successfully created!');
                setIsOpen(false);
                setSelectedActivities(newSet => { newSet.clear(); return newSet; });
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
                        <form ref={formRef} action={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
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

                            <div className="space-y-2">
                                <label htmlFor="default_hourly_rate" className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Hourly Rate
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                    <input
                                        id="default_hourly_rate"
                                        name="default_hourly_rate"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        disabled={isPending}
                                        className="w-full bg-black/50 border border-white/10 rounded-sm pl-8 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-pitch-accent focus:ring-1 focus:ring-pitch-accent transition-all"
                                    />
                                </div>
                                <p className="text-xs text-gray-500">Leaving this blank or 0 will make the resource free to book.</p>
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
                                <label htmlFor="resource_type_id" className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Resource Type
                                </label>
                                <select
                                    id="resource_type_id"
                                    name="resource_type_id"
                                    required
                                    disabled={isPending || !resourceTypes || resourceTypes.length === 0}
                                    defaultValue=""
                                    className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent focus:ring-1 focus:ring-pitch-accent transition-all appearance-none"
                                >
                                    <option value="" disabled className="text-gray-500">
                                        {!resourceTypes || resourceTypes.length === 0 ? 'No Master Types found! Create one in Master Admin Settings.' : 'Select a global resource type...'}
                                    </option>
                                    {resourceTypes && resourceTypes.map(rt => (
                                        <option key={rt.id} value={rt.id}>{rt.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3 relative">
                                <div className="flex justify-between items-center">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        Supported Activities
                                    </label>
                                    <span className="text-xs text-gray-500">{selectedActivities.size} selected</span>
                                </div>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsActivitiesOpen(!isActivitiesOpen)}
                                        className="w-full flex items-center justify-between bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-all"
                                    >
                                        <span className={selectedActivities.size === 0 ? "text-gray-500" : "text-white"}>
                                            {selectedActivities.size === 0 ? 'Select activities...' : `${selectedActivities.size} Activities Selected`}
                                        </span>
                                        <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isActivitiesOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isActivitiesOpen && (
                                        <div className="absolute z-10 w-full mt-1 bg-neutral-900 border border-white/10 rounded-sm p-2 max-h-48 overflow-y-auto space-y-1 shadow-xl">
                                            {!activityTypes || activityTypes.length === 0 ? (
                                                <p className="text-sm text-gray-500 italic p-2">
                                                    No activities are activated for this facility yet. Go to Settings to activate them.
                                                </p>
                                            ) : (
                                                activityTypes.map(act => {
                                                    const isSelected = selectedActivities.has(act.id);
                                                    return (
                                                        <button
                                                            key={act.id}
                                                            type="button"
                                                            onClick={() => toggleActivity(act.id)}
                                                            className={`
                                                                w-full flex items-center justify-between p-2 rounded-sm transition-all text-sm
                                                                ${isSelected
                                                                    ? 'bg-pitch-accent/20 text-white'
                                                                    : 'hover:bg-white/5 text-gray-400 hover:text-white'}
                                                            `}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-3 h-3 rounded-full border border-white/20"
                                                                    style={{ backgroundColor: act.color_code }}
                                                                />
                                                                <span className="font-bold">{act.name}</span>
                                                            </div>
                                                            {isSelected && <Check className="w-4 h-4 text-pitch-accent" />}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
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
