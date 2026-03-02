import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trophy } from 'lucide-react';
import { LeagueBuilderForm } from '@/components/facility/LeagueBuilderForm';
import { updateLeague } from '@/app/actions/facility';

export const metadata = {
    title: 'Edit League | Pitch Side',
    description: 'Edit league rules and settings',
};

export default async function EditLeaguePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Get the facility ID from the user's profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('facility_id, system_role, role')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.system_role === 'super_admin' || profile?.role === 'master_admin';
    const facilityId = profile?.facility_id;

    if (!isSuperAdmin && !facilityId) {
        redirect('/');
    }

    // Fetch the league to edit along with its linked resources
    const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select(`
            *,
            league_resources (
                resource_id
            )
        `)
        .eq('id', resolvedParams.id)
        .single();

    if (leagueError || !league) {
        redirect('/facility/leagues');
    }

    // Security Check: Ensure facility admin owns this league
    if (!isSuperAdmin && league.facility_id !== facilityId) {
        redirect('/facility/leagues');
    }

    // Fetch activities that this facility has activated
    const { data: facilityActivities } = await supabase
        .from('facility_activities')
        .select(`
            activity_types (
                id,
                name
            )
        `)
        .eq('facility_id', league.facility_id);

    // Flatten the linked Master data
    const activityTypes: { id: string; name: string }[] = facilityActivities
        ?.map((fa: any) => fa.activity_types)
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name)) || [];

    // Fetch resources belonging to this facility
    const { data: resourcesData } = await supabase
        .from('resources')
        .select(`
            id, 
            name, 
            resource_type_id,
            resource_types (
                name
            )
        `)
        .eq('facility_id', league.facility_id)
        .order('name');

    const resources = resourcesData || [];

    // Bind the Server Action to this specific league ID
    const updateLeagueAction = updateLeague.bind(null, resolvedParams.id);

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-12">

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href={`/facility/leagues`}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-4xl font-heading font-black italic uppercase tracking-tight text-white flex items-center gap-3">
                        Edit <span className="text-pitch-accent">{league.name}</span>
                    </h1>
                    <p className="text-gray-400 mt-1 font-medium">
                        Modify rules, formats, and scheduling.
                    </p>
                </div>
            </div>

            {/* Form Container (Client Component) */}
            <LeagueBuilderForm
                activityTypes={activityTypes}
                resources={resources}
                action={updateLeagueAction}
                initialData={league}
            />

        </div>
    );
}
