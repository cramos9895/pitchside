import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Activity, Check, Plus } from 'lucide-react';
import { toggleFacilityActivity } from '@/app/actions/facility';

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

    const adminSupabase = createAdminClient();

    // Fetch all global activity types
    const { data: globalActivities } = await adminSupabase
        .from('activity_types')
        .select('*')
        .order('name');

    // Fetch facility's activated activities
    const { data: activatedActivitiesArray } = await adminSupabase
        .from('facility_activities')
        .select('activity_type_id')
        .eq('facility_id', activeFacilityId);

    // Convert to a Set for O(1) lookups
    const activatedIds = new Set(activatedActivitiesArray?.map((a) => a.activity_type_id) || []);

    return (
        <div className="animate-in fade-in duration-500 max-w-4xl">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-black italic text-white uppercase tracking-wider mb-2 flex items-center gap-3">
                        <Activity className="w-8 h-8 text-pitch-accent" />
                        Activated Facility Activities
                    </h1>
                    <p className="text-gray-400">
                        Select the sports and activities that your facility explicitly hosts. These will appear as options when adding resources.
                    </p>
                </div>
            </div>

            <div className="bg-pitch-card border border-white/10 rounded-sm p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {globalActivities?.map((activity) => {
                        const isActive = activatedIds.has(activity.id);

                        return (
                            <form key={activity.id} action={async () => {
                                'use server';
                                await toggleFacilityActivity(activeFacilityId, activity.id, isActive);
                            }}>
                                <button
                                    type="submit"
                                    className={`
                                        w-full flex items-center justify-between p-4 rounded-sm border transition-all duration-300
                                        ${isActive
                                            ? 'bg-pitch-accent/10 border-pitch-accent/50 hover:bg-pitch-accent/20 hover:border-pitch-accent'
                                            : 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-white/5'}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-4 h-4 rounded-full border border-white/20"
                                            style={{ backgroundColor: activity.color_code }}
                                        />
                                        <span className={`font-bold transition-colors ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                            {activity.name}
                                        </span>
                                    </div>
                                    <div className={`
                                        w-6 h-6 rounded-full flex items-center justify-center transition-all
                                        ${isActive ? 'bg-pitch-accent text-pitch-black' : 'bg-black/50 border border-white/10 text-transparent'}
                                    `}>
                                        <Check className="w-4 h-4" />
                                    </div>
                                </button>
                            </form>
                        );
                    })}
                </div>
                {(!globalActivities || globalActivities.length === 0) && (
                    <div className="text-center py-12 text-gray-400 italic">
                        No global activities have been created by the Pitch Side Master Admins yet.
                    </div>
                )}
            </div>
        </div>
    );
}
