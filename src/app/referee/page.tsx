import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import RefereeDashboardClient from './RefereeDashboardClient';

export default async function RefereeDashboardPage() {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
            },
        }
    );

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get the profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile) return null;

    // Fetch Upcoming Slate: match_officials where user_id = current user and status = Confirmed
    const { data: upcomingOfficials } = await supabase
        .from('match_officials')
        .select('*, matches(*)')
        .eq('user_id', user.id)
        .eq('status', 'Confirmed');

    // Fetch Open Market: All upcoming matches (for now, simply querying matches limit 20)
    // Filter out 'pickup' games
    const { data: openMarket } = await supabase
        .from('matches')
        .select('*, match_officials(*), games!inner(event_type)')
        .neq('games.event_type', 'pickup')
        .order('created_at', { ascending: false })
        .limit(20);

    return (
        <RefereeDashboardClient 
            upcomingMatches={upcomingOfficials || []}
            openMarketMatches={openMarket || []}
            userProfile={profile}
        />
    );
}
