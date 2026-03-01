import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trophy } from 'lucide-react';
// @ts-ignore - Valid export exists in the file
import { ManageLeagueTabs } from '@/components/facility/ManageLeagueTabs';

export const metadata = {
    title: 'Manage League | Pitch Side',
    description: 'Manage league schedule, standings, and results',
};

export default async function ManageLeaguePage({ params }: { params: Promise<{ id: string }> }) {
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

    // Fetch the league and its teams
    const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select(`
            *,
            teams (
                id,
                name,
                captain_id,
                status
            )
        `)
        .eq('id', resolvedParams.id)
        .single();

    if (leagueError || !league) {
        redirect('/facility/leagues');
    }

    // Security Check
    if (!isSuperAdmin && league.facility_id !== facilityId) {
        redirect('/facility/leagues');
    }

    // Fetch league matches
    const { data: matches } = await supabase
        .from('league_matches')
        .select(`
            *,
            home_team:teams!league_matches_home_team_id_fkey(name),
            away_team:teams!league_matches_away_team_id_fkey(name)
        `)
        .eq('league_id', resolvedParams.id)
        .order('week_number', { ascending: true })
        .order('start_time', { ascending: true });

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-12">

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
                        <Trophy className="w-8 h-8 text-pitch-accent" />
                        {league.name}
                    </h1>
                    <p className="text-gray-400 mt-1 font-medium flex items-center gap-2">
                        <span>{league.season || 'TBD Season'}</span>
                        <span className="text-white/20">•</span>
                        <span className="capitalize">{league.status}</span>
                    </p>
                </div>
            </div>

            {/* Client Component Tabs Manager */}
            <ManageLeagueTabs league={league} matches={matches || []} />

        </div>
    );
}
