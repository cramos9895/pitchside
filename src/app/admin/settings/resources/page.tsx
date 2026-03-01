import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Plus, MapPin } from 'lucide-react';
import Link from 'next/link';
import { ResourceItem } from '@/components/admin/ResourceItem';
import { createResourceType } from '@/app/actions/master-settings';

export default async function MasterResourceTypesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'master_admin') {
        redirect('/admin');
    }

    const { data: resourceTypes } = await supabase
        .from('resource_types')
        .select('*')
        .order('name');

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-oswald text-3xl font-bold uppercase flex items-center gap-3 text-white">
                        <MapPin className="w-8 h-8 text-pitch-accent" />
                        Global Resource Types
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Define the universal list of bookable resource types (e.g. "Full Size Turf", "Hardwood Court").
                        Facilities will choose from these when creating their specific courts/fields.
                    </p>
                </div>
                <Link href="/admin/settings" className="px-4 py-2 border border-white/10 rounded text-sm font-bold uppercase hover:bg-white/5 transition-colors">
                    Back to Settings
                </Link>
            </div>

            <div className="bg-pitch-card border border-white/5 rounded-sm p-6">
                <form action={async (formData) => {
                    'use server';
                    await createResourceType(formData);
                }} className="flex gap-4 items-end mb-8 p-4 bg-black/20 rounded border border-white/5">
                    <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold uppercase text-pitch-secondary">Type Name</label>
                        <input
                            name="name"
                            required
                            placeholder="e.g. Tennis Court"
                            className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                        />
                    </div>
                    <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold uppercase text-pitch-secondary">Description (Optional)</label>
                        <input
                            name="description"
                            placeholder="Brief description"
                            className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                        />
                    </div>
                    <button type="submit" className="px-6 py-3 bg-pitch-accent text-pitch-black font-bold uppercase tracking-wider rounded-sm hover:bg-white transition-colors flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add
                    </button>
                </form>

                <div className="space-y-4">
                    {resourceTypes?.map((resource) => (
                        <ResourceItem key={resource.id} resource={resource} />
                    ))}
                    {(!resourceTypes || resourceTypes.length === 0) && (
                        <div className="text-center py-12 text-gray-500 italic">
                            No resource types registered. Add one above.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
