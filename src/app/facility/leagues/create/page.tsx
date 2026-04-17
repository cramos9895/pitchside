import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { LeagueBuilderForm } from '@/components/facility/LeagueBuilderForm';

export const metadata = {
    title: 'Create League | Pitch Side',
    description: 'Create a new league for your facility',
};

export default async function CreateLeaguePage() {
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

    // Fetch activities that this facility has activated
    const { data: facilityActivities } = await supabase
        .from('facility_activities')
        .select(`
            activity_types (
                id,
                name
            )
        `)
        .eq('facility_id', facilityId);

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
        .eq('facility_id', facilityId)
        .order('name');

    const resources = (resourcesData || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        resource_types: Array.isArray(r.resource_types) ? r.resource_types[0] : r.resource_types
    }));

    // Server Action to create the league
    async function createLeague(formData: FormData) {
        'use server';

        const supabase = await createClient();

        const name = formData.get('name') as string;
        const season = formData.get('season') as string;
        const activity_id = formData.get('activity_id') as string;
        const price = formData.get('price') as string;
        const max_roster = formData.get('max_roster') as string;
        const min_roster = formData.get('min_roster') as string;
        const max_teams = formData.get('max_teams') as string;
        const start_date = formData.get('start_date') as string;
        
        let end_date = formData.get('end_date') as string;
        let has_playoffs = formData.get('has_playoffs') === 'on';
        let playoff_spots = formData.get('playoff_spots') as string;
        
        const league_format = formData.get('league_format') as string || 'structured';
        if (league_format === 'rolling') {
            end_date = '';
            has_playoffs = false;
            playoff_spots = '';
        }

        // Expanded Rules
        const format = formData.get('format') as string;
        const game_length = formData.get('game_length') as string;
        const game_periods = formData.get('game_periods') as string;
        const game_days = formData.get('game_days') as string;

        const time_range_start = formData.get('time_range_start') as string;
        const time_range_end = formData.get('time_range_end') as string;

        // Parse resources
        const resourceIdsRaw = formData.get('resource_ids') as string;
        let resourceIds: string[] = [];
        try {
            if (resourceIdsRaw) resourceIds = JSON.parse(resourceIdsRaw);
        } catch (e) {
            console.error("Failed to parse resource_ids", e);
        }

        // We get the sport name fallback if no activity_id is selected, but it is required in form
        const sportFallback = 'Other';

        const { data: newLeague, error } = await supabase
            .from('leagues')
            .insert({
                facility_id: facilityId,
                name,
                season,
                league_format,
                sport: sportFallback, // Needed for DB constraint, though activity_id is primary
                activity_id: activity_id ? activity_id : null,
                price: price ? parseFloat(price) : null,
                max_roster: max_roster ? parseInt(max_roster) : null,
                min_roster: min_roster ? parseInt(min_roster) : null,
                max_teams: max_teams ? parseInt(max_teams) : null,
                start_date: start_date || null,
                end_date: end_date || null,
                format: format || null,
                game_length: game_length ? parseInt(game_length) : null,
                game_periods: game_periods || null,
                game_days: game_days || null,
                has_playoffs,
                playoff_spots: has_playoffs && playoff_spots ? parseInt(playoff_spots) : null,
                time_range_start: time_range_start || null,
                time_range_end: time_range_end || null,
                status: 'registration',
                registration_open: true
            })
            .select()
            .single();

        if (error || !newLeague) {
            console.error("Error creating league:", error);
            // In a real app we'd return an error state to the form
            throw new Error("Failed to create league");
        }

        // Link Resources
        if (resourceIds.length > 0) {
            const resourceLinks = resourceIds.map(rId => ({
                league_id: newLeague.id,
                resource_id: rId
            }));

            const { error: linkError } = await supabase.from('league_resources').insert(resourceLinks);
            if (linkError) {
                console.error("Error linking resources:", linkError);
                // Allow creation to proceed, warn in logs
            }
        }

        revalidatePath('/facility/leagues');
        redirect('/facility/leagues');
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-12">

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/facility/leagues"
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-4xl font-heading font-black italic uppercase tracking-tight text-white flex items-center gap-3">
                        Build a League
                    </h1>
                    <p className="text-gray-400 mt-1 font-medium">
                        Configure the settings, pricing, and rules for a new season.
                    </p>
                </div>
            </div>

            {/* Form Container (Client Component) */}
            <LeagueBuilderForm
                activityTypes={activityTypes}
                resources={resources}
                action={createLeague}
            />

        </div>
    );
}
