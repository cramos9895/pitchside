'use client';

import { useState, useRef } from 'react';
import { Trash2, Edit2, Check, X, Loader2 } from 'lucide-react';
import { updateResourceType, deleteResourceType } from '@/app/actions/master-settings';

interface ResourceItemProps {
    resource: {
        id: string;
        name: string;
        description: string | null;
    };
}

export function ResourceItem({ resource }: ResourceItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const handleUpdate = async (formData: FormData) => {
        setIsPending(true);
        try {
            await updateResourceType(resource.id, formData);
            setIsEditing(false);
        } finally {
            setIsPending(false);
        }
    };

    if (isEditing) {
        return (
            <div className="p-4 bg-black/40 rounded-sm border border-pitch-accent transition-colors">
                <form ref={formRef} action={handleUpdate} className="flex items-center gap-4">
                    <div className="flex-1">
                        <input
                            name="name"
                            defaultValue={resource.name}
                            required
                            placeholder="Resource Type Name"
                            className="w-full bg-black/40 border border-white/10 rounded-sm p-2 text-white focus:outline-none focus:border-pitch-accent text-sm"
                        />
                    </div>
                    <div className="flex-[2]">
                        <input
                            name="description"
                            defaultValue={resource.description || ''}
                            placeholder="Description (optional)"
                            className="w-full bg-black/40 border border-white/10 rounded-sm p-2 text-white focus:outline-none focus:border-pitch-accent text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="p-2 bg-pitch-accent text-black rounded-sm hover:bg-white transition-colors"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            disabled={isPending}
                            className="p-2 border border-white/20 text-gray-400 rounded-sm hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between p-4 bg-black/40 rounded-sm border border-white/5 hover:border-white/10 transition-colors group">
            <div>
                <h3 className="font-bold text-white text-lg">{resource.name}</h3>
                {resource.description && <p className="text-sm text-gray-500">{resource.description}</p>}
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-gray-500 hover:text-pitch-accent transition-colors"
                    title="Edit Resource Type"
                >
                    <Edit2 className="w-5 h-5" />
                </button>
                <form action={async () => {
                    await deleteResourceType(resource.id);
                }}>
                    <button type="submit" className="p-2 text-gray-500 hover:text-red-500 transition-colors" title="Delete Resource Type">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
