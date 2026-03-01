import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Plus, MapPin, Database } from 'lucide-react';
import { ResourceModal } from '@/components/facility/ResourceModal';
import { FacilityResourceItem } from '@/components/facility/FacilityResourceItem';

export default async function ResourcesManager() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 1. Fetch Profile to get facility_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('facility_id, system_role, role')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.system_role === 'super_admin' || profile?.role === 'master_admin';

    if (!isSuperAdmin && !profile?.facility_id) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Database className="w-16 h-16 text-gray-600 mb-6" />
                <h2 className="text-3xl font-heading font-black italic uppercase tracking-wider mb-2">
                    No Facility Assigned
                </h2>
                <p className="text-gray-400 max-w-md">
                    Your account does not have a physical Facility ID bound to it yet. Please contact the system administrator to link your account before managing resources.
                </p>
            </div>
        );
    }

    // 2. Fetch Resources with joined resource_types
    let query = supabase
        .from('resources')
        .select(`
            *, 
            facilities(name),
            resource_types(name),
            resource_activities(
                activity_types(id, name, color_code)
            )
        `)
        .order('created_at', { ascending: false });

    if (!isSuperAdmin) {
        query = query.eq('facility_id', profile?.facility_id);
    }

    const { data: resources, error: fetchError } = await query;

    const adminAuthClient = createAdminClient();

    // 3. Fetch Master Data

    // 3a. All Facilities if Super Admin
    let allFacilities: { id: string, name: string }[] = [];
    if (isSuperAdmin) {
        const { data: facs } = await adminAuthClient.from('facilities').select('id, name').order('name');
        if (facs) allFacilities = facs;
    }

    // 3b. Global Resource Types
    const { data: resourceTypes } = await adminAuthClient.from('resource_types').select('*').order('name');

    // 3c. Fetch Activated Activity Types for the current/impersonated facility
    let activeFacilityId = profile?.facility_id;
    if (isSuperAdmin) {
        const cookieStore = await cookies();
        const impersonateCookie = cookieStore.get('pitchside_impersonate_facility_id');
        if (impersonateCookie?.value) {
            activeFacilityId = impersonateCookie.value;
        }
    }

    let activityTypes: any[] = [];
    if (activeFacilityId) {
        // We join facility_activities to activity_types to only get what's activated
        const { data: acts } = await adminAuthClient
            .from('facility_activities')
            .select(`
                activity_type_id,
                activity_types ( id, name, color_code )
            `)
            .eq('facility_id', activeFacilityId);

        if (acts) {
            activityTypes = acts.map(a => a.activity_types).filter(Boolean); // Flatten
        }
    }

    return (
        <div className="animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-black italic text-white uppercase tracking-wider mb-2 flex items-center gap-3">
                        <MapPin className="w-8 h-8 text-pitch-accent" />
                        Resource Manager
                    </h1>
                    <p className="text-gray-400">Manage courts, fields, and playable areas for your facility.</p>
                </div>

                {/* Embedded Client Modal Trigger */}
                <ResourceModal
                    isSuperAdmin={isSuperAdmin}
                    facilities={allFacilities}
                    resourceTypes={resourceTypes || []}
                    activityTypes={activityTypes}
                />
            </div>

            {/* Resources Data Table */}
            <div className="bg-pitch-card border border-white/10 rounded-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                                <th className="p-4 font-bold">Resource Name</th>
                                {isSuperAdmin && <th className="p-4 font-bold">Facility Name</th>}
                                <th className="p-4 font-bold">Archetype</th>
                                <th className="p-4 font-bold text-right">Added</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {fetchError || !resources || resources.length === 0 ? (
                                <tr>
                                    <td colSpan={isSuperAdmin ? 4 : 3} className="p-8 text-center text-gray-500 italic">
                                        No resources found. Click "Add Resource" to create your first field or court.
                                    </td>
                                </tr>
                            ) : (
                                resources.map((resource) => (
                                    <FacilityResourceItem
                                        key={resource.id}
                                        resource={resource}
                                        isSuperAdmin={isSuperAdmin}
                                        resourceTypes={resourceTypes || []}
                                        activityTypes={activityTypes}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
