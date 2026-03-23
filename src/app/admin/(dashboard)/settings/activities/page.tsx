import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Plus, Activity } from 'lucide-react';
import Link from 'next/link';
import { ActivityItem } from '@/components/admin/ActivityItem';
import { createGlobalActivityType } from '@/app/actions/master-settings';

export default async function MasterActivityTypesPage() {
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

    const { data: activityTypes } = await supabase
        .from('activity_types')
        .select('*')
        .order('name');

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-oswald text-3xl font-bold uppercase flex items-center gap-3 text-white">
                        <Activity className="w-8 h-8 text-pitch-accent" />
                        Global Activity Types
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Define the universal list of sports and activities (e.g. "Soccer", "Basketball", "Pickleball").
                        Facilities will toggle these on/off to explicitly build their offerings.
                    </p>
                </div>
                <Link href="/admin/settings" className="px-4 py-2 border border-white/10 rounded text-sm font-bold uppercase hover:bg-white/5 transition-colors">
                    Back to Settings
                </Link>
            </div>

            <div className="bg-pitch-card border border-white/5 rounded-sm p-6">
                <form action={async (formData) => {
                    'use server';
                    await createGlobalActivityType(formData);
                }} className="flex gap-4 items-end mb-8 p-4 bg-black/20 rounded border border-white/5">
                    <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold uppercase text-pitch-secondary">Activity Name</label>
                        <input
                            name="name"
                            required
                            placeholder="e.g. Futsal"
                            className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                        />
                    </div>
                    <div className="w-24 space-y-2">
                        <label className="text-xs font-bold uppercase text-pitch-secondary">Color</label>
                        <input
                            type="color"
                            name="colorCode"
                            defaultValue="#CCFF00"
                            className="w-full h-[50px] bg-black/40 border border-white/10 rounded-sm cursor-pointer"
                        />
                    </div>
                    <button type="submit" className="px-6 py-3 bg-pitch-accent text-pitch-black font-bold uppercase tracking-wider rounded-sm hover:bg-white transition-colors flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add
                    </button>
                </form>

                <div className="space-y-4">
                    {activityTypes?.map((activity) => (
                        <ActivityItem key={activity.id} activity={activity} />
                    ))}
                    {(!activityTypes || activityTypes.length === 0) && (
                        <div className="text-center py-12 text-gray-500 italic">
                            No activities registered. Add one above.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
