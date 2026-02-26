import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Activity, Plus, Trash2 } from 'lucide-react';
import { createActivityType, deleteActivityType } from '@/app/actions/facility';

export default async function ActivityTypesSettings() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('system_role, role, facility_id')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.system_role === 'super_admin' || profile?.role === 'master_admin';

    // 1. Determine active facility_id
    let activeFacilityId = profile?.facility_id;
    if (isSuperAdmin) {
        const cookieStore = await cookies();
        const impersonateCookie = cookieStore.get('pitchside_impersonate_facility_id');
        if (impersonateCookie?.value) {
            activeFacilityId = impersonateCookie.value;
        }
    }

    if (!activeFacilityId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <h2 className="text-3xl font-heading font-black italic uppercase tracking-wider mb-2 text-white">
                    No Facility Selected
                </h2>
                <p className="text-gray-400 max-w-md">
                    You must be assigned to a facility or use Super Admin God Mode to manage Activity Types.
                </p>
            </div>
        );
    }

    // 2. Fetch configured Activity Types for this facility
    const adminSupabase = createAdminClient();
    const { data: activities, error } = await adminSupabase
        .from('activity_types')
        .select('*')
        .eq('facility_id', activeFacilityId)
        .order('name');

    return (
        <div className="animate-in fade-in duration-500 max-w-4xl">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-black italic text-white uppercase tracking-wider mb-2 flex items-center gap-3">
                        <Activity className="w-8 h-8 text-pitch-accent" />
                        Activity Types
                    </h1>
                    <p className="text-gray-400">Configure the sports and activities hosted at your facility.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Form Column */}
                <div className="md:col-span-1">
                    <div className="bg-pitch-card border border-white/10 rounded-sm p-6 sticky top-24">
                        <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">Add New Type</h2>
                        {/* @ts-ignore */}
                        <form action={createActivityType} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="name" className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Sport / Activity Name
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    placeholder="e.g. Pickleball"
                                    className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-pitch-accent"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="color_code" className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Display Color
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        id="color_code"
                                        name="color_code"
                                        type="color"
                                        defaultValue="#00FF00"
                                        className="h-10 w-16 bg-black/50 border border-white/10 rounded-sm cursor-pointer p-1"
                                    />
                                    <span className="text-xs text-gray-500">Choose an identifier color</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-4 flex items-center justify-center gap-2 bg-pitch-accent text-pitch-black px-6 py-3 rounded-sm font-black uppercase tracking-wider hover:bg-white transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Add Activity
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Column */}
                <div className="md:col-span-2">
                    <div className="bg-pitch-card border border-white/10 rounded-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                                    <th className="p-4 font-bold">Activity Name</th>
                                    <th className="p-4 font-bold text-center">Color</th>
                                    <th className="p-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {error || !activities || activities.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-gray-500 italic">
                                            No activity types configured yet. Add your first sport!
                                        </td>
                                    </tr>
                                ) : (
                                    activities.map((activity) => (
                                        <tr key={activity.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-4">
                                                <div className="font-bold text-white text-lg">{activity.name}</div>
                                            </td>
                                            <td className="p-4 text-center text-sm text-gray-400">
                                                <div className="flex justify-center items-center gap-2">
                                                    <div
                                                        className="w-6 h-6 rounded-full border border-white/20"
                                                        style={{ backgroundColor: activity.color_code }}
                                                    />
                                                    <span className="font-mono text-xs">{activity.color_code}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                {/* @ts-ignore */}
                                                <form action={deleteActivityType.bind(null, activity.id)}>
                                                    <button
                                                        type="submit"
                                                        className="text-gray-500 hover:text-red-500 transition-colors p-2 rounded-sm hover:bg-red-500/10"
                                                        title="Delete Activity"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </form>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
