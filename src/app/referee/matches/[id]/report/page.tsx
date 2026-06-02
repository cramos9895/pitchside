import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MatchReportClient } from './MatchReportClient';
import { cookies } from 'next/headers';

export default async function MatchReportPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const cookieStore = await cookies();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: match, error } = await supabase
        .from('matches')
        .select(`
            *,
            home_team_rel:teams!home_team_id(name),
            away_team_rel:teams!away_team_id(name),
            match_events(*),
            games(title)
        `)
        .eq('id', params.id)
        .single();

    if (error || !match) {
        console.error("Match fetch error:", error);
        redirect('/referee');
    }

    if (match.status !== 'finalized') {
        redirect(`/referee/matches/${params.id}`);
    }

    // Verify official is assigned
    const { data: assignment } = await supabase
        .from('match_officials')
        .select('*')
        .eq('match_id', params.id)
        .eq('user_id', user.id)
        .single();

    if (!assignment && user.id !== 'testing-override') { // Remove override logic in strict prod
        redirect('/referee');
    }

    return (
        <MatchReportClient 
            match={match} 
            events={match.match_events || []} 
            refereeId={user.id}
        />
    );
}
