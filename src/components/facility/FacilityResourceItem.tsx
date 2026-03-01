'use client';

import { useState, useRef } from 'react';
import { Edit2, Trash2, Check, X, Loader2, ChevronDown } from 'lucide-react';
import { updateResource, deleteResource } from '@/app/actions/facility';
import { useToast } from '@/components/ui/Toast';

interface FacilityResourceItemProps {
    resource: any;
    isSuperAdmin: boolean;
    resourceTypes: any[];
    activityTypes: any[];
}

export function FacilityResourceItem({ resource, isSuperAdmin, resourceTypes, activityTypes }: FacilityResourceItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, setIsPending] = useState(false);

    // Map existing activities to initial state
    const initialActivities = new Set<string>(resource.resource_activities?.map((ra: any) => ra.activity_types?.id).filter(Boolean) || []);
    const [selectedActivities, setSelectedActivities] = useState<Set<string>>(initialActivities);
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

    const handleUpdate = async (formData: FormData) => {
        if (selectedActivities.size === 0) {
            error('Please select at least one activity type.');
            return;
        }

        setIsPending(true);
        formData.append('activity_ids', JSON.stringify(Array.from(selectedActivities)));

        try {
            const result = await updateResource(resource.id, formData);
            if (result.error) {
                error(result.error);
            } else if (result.success) {
                success('Resource successfully updated!');
                setIsEditing(false);
            }
        } catch (err: any) {
            error(err.message || 'An unexpected error occurred.');
        } finally {
            setIsPending(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) return;

        setIsPending(true);
        try {
            const result = await deleteResource(resource.id);
            if (result.error) {
                error(result.error);
            } else if (result.success) {
                success('Resource successfully deleted!');
            }
        } catch (err: any) {
            error(err.message || 'An unexpected error occurred.');
        } finally {
            setIsPending(false);
        }
    };

    // --- RENDER EDIT STATE ---
    if (isEditing) {
        return (
            <tr className="bg-black/40 border border-pitch-accent transition-colors shadow-2xl relative z-10">
                <td colSpan={isSuperAdmin ? 5 : 4} className="p-4">
                    <form ref={formRef} action={handleUpdate} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">

                        {/* Name Input */}
                        <div className="md:col-span-3 space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Name</label>
                            <input
                                name="name"
                                defaultValue={resource.name}
                                required
                                disabled={isPending}
                                className="w-full bg-black/60 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent text-sm transition-colors"
                            />
                        </div>

                        {/* Resource Type Dropdown */}
                        <div className="md:col-span-3 space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Type</label>
                            <select
                                name="resource_type_id"
                                required
                                disabled={isPending || !resourceTypes.length}
                                defaultValue={resource.resource_type_id || ''}
                                className="w-full bg-black/60 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent text-sm appearance-none cursor-pointer"
                            >
                                <option value="" disabled>Select Type...</option>
                                {resourceTypes.map(rt => (
                                    <option key={rt.id} value={rt.id}>{rt.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Supported Activities Multi-Select Dropdown */}
                        <div className="md:col-span-4 space-y-1 relative">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Activities</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsActivitiesOpen(!isActivitiesOpen)}
                                    className="w-full flex items-center justify-between bg-black/60 border border-white/10 rounded-sm px-3 py-3 text-white focus:outline-none focus:border-pitch-accent transition-all text-sm"
                                >
                                    <span className={selectedActivities.size === 0 ? "text-gray-500" : "text-white truncate"}>
                                        {selectedActivities.size === 0 ? 'Select activities...' : `${selectedActivities.size} Selected`}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isActivitiesOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isActivitiesOpen && (
                                    <div className="absolute z-20 w-full mt-1 bg-neutral-900 border border-white/10 rounded-sm p-2 max-h-48 overflow-y-auto space-y-1 shadow-2xl">
                                        {!activityTypes || activityTypes.length === 0 ? (
                                            <p className="text-xs text-gray-500 italic p-2">No activities activated.</p>
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
                                                                className="w-2.5 h-2.5 rounded-full border border-white/20"
                                                                style={{ backgroundColor: act.color_code }}
                                                            />
                                                            <span className="font-bold truncate">{act.name}</span>
                                                        </div>
                                                        {isSelected && <Check className="w-3 h-3 text-pitch-accent" />}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="md:col-span-2 flex items-center justify-end gap-2 h-full mt-6">
                            <button
                                type="submit"
                                disabled={isPending}
                                className="p-3 bg-pitch-accent text-black rounded-sm hover:bg-white transition-colors flex-1 flex justify-center"
                            >
                                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditing(false);
                                    setSelectedActivities(initialActivities); // Reset
                                }}
                                disabled={isPending}
                                className="p-3 border border-white/20 text-gray-400 rounded-sm hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </form>
                </td>
            </tr>
        );
    }

    // --- RENDER READ-ONLY STATE ---

    // Safely extract activated activities for display pills
    const mappedActivities = resource.resource_activities?.map((ra: any) => ra.activity_types).filter(Boolean) || [];

    return (
        <tr className="hover:bg-white/[0.02] transition-colors group">
            <td className="p-4 align-top">
                <div className="font-bold text-white text-lg">{resource.name}</div>
                <div className="text-xs text-gray-500 font-mono mt-1">{resource.id.substring(0, 8)}...</div>

                {/* Activities Pills */}
                {mappedActivities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {mappedActivities.map((act: any) => (
                            <div
                                key={act.id}
                                className="flex items-center gap-1.5 px-2 py-1 rounded border border-white/10 bg-black/50"
                            >
                                <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: act.color_code }} />
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider leading-none">
                                    {act.name}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </td>
            {isSuperAdmin && (
                <td className="p-4 align-top">
                    <span className="text-gray-300 font-bold">{resource.facilities?.name || 'Unknown'}</span>
                </td>
            )}
            <td className="p-4 align-top">
                <span className="bg-pitch-accent/20 text-pitch-accent px-3 py-1 rounded-sm text-xs font-bold uppercase tracking-wider border border-pitch-accent/30 inline-block">
                    {resource.resource_types?.name || 'Legacy Resource'}
                </span>
            </td>
            <td className="p-4 align-top text-right text-sm text-gray-400">
                {new Date(resource.created_at).toLocaleDateString()}
            </td>
            <td className="p-4 align-top text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 text-gray-500 hover:text-pitch-accent transition-colors bg-black/40 border border-white/5 rounded"
                        title="Edit Resource"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isPending}
                        className="p-2 text-gray-500 hover:text-red-500 transition-colors bg-black/40 border border-white/5 rounded"
                        title="Delete Resource"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                </div>
            </td>
        </tr>
    );
}
