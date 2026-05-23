
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { MapPin, Clock, ArrowRight, Calendar, Users, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PickupCard } from '@/components/public/pickup/PickupCard';
import { TournamentCard } from '@/components/public/tournaments/TournamentCard';
import { LeagueCard } from '@/components/public/leagues/LeagueCard';
import { RollingLeagueCard } from '@/components/public/RollingLeagueCard';
import { ScheduleClientView } from '@/components/public/ScheduleClientView';

interface Game {
    id: string;
    title: string;
    location_name?: string;
    location: string;
    location_nickname?: string;
    game_format?: string;
    start_time: string;
    end_time: string | null;
    price: number;
    max_players: number;
    max_teams: number | null;
    current_players: number;
    surface_type: string;
    facility_id?: string | null;
    resource_id?: string | null;
    status: string;
    has_mvp_reward?: boolean;
    match_style?: string;
    event_type?: string;
    is_league?: boolean;
    team_price: number | null;
    free_agent_price: number | null;
    prize_pool_percentage: number | null;
    fixed_prize_amount: number | null;
    reward: string | null;
    prize_type: string | null;
    tournament_style: string | null;
    roster_lock_date: string | null;
    regular_season_start: string | null;
    playoff_start_date: string | null;
    
    // Architecture Columns
    league_format?: 'structured' | 'rolling';
    payment_collection_type?: 'stripe' | 'cash';
}

interface League extends Game {
    start_date?: string; // Legacy leagues use start_date
}

export const revalidate = 0; // Ensure fresh data

// Helper to format date for grouping header
const formatDateHeader = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

export default async function SchedulePage({ 
    searchParams 
}: { 
    searchParams: Promise<{ view?: string }> 
}) {
    const supabase = await createClient();
    const activeView = (await searchParams).view || 'all';

    // Fetch user bookings to check status
    const { data: { user } } = await supabase.auth.getUser();
    const bookingStatusMap: Record<string, string> = {};
    const bookingIdMap: Record<string, string> = {};
    const userRegistrationsMap: Record<string, any[]> = {};

    if (user) {
        const [bookingsRes, regsRes] = await Promise.all([
            supabase
                .from('bookings')
                .select('id, game_id, status')
                .eq('user_id', user.id)
                .neq('status', 'cancelled'),
            supabase
                .from('tournament_registrations')
                .select('game_id, role, team_id, user_id, status, teams(id, name, captain_id)')
                .eq('user_id', user.id)
        ]);

        if (bookingsRes.data) {
            bookingsRes.data.forEach((b: any) => {
                bookingStatusMap[b.game_id] = b.status;
                bookingIdMap[b.game_id] = b.id;
            });
        }

        if (regsRes.data) {
            regsRes.data.forEach((r: any) => {
                if (r.game_id) {
                    if (!userRegistrationsMap[r.game_id]) {
                        userRegistrationsMap[r.game_id] = [];
                    }
                    userRegistrationsMap[r.game_id].push(r);
                }
            });
        }
    }

    // Fetch all upcoming games if needed
    let games: any[] | null = null;
    let gamesError = null;
    if (activeView === 'all' || activeView === 'pickup') {
        const res = await supabase
            .from('games')
            .select('*')
            .neq('status', 'cancelled')
            .or('is_league.eq.false,is_league.is.null') // MUST filter out league games here
            .gt('start_time', new Date().toISOString())
            .order('start_time', { ascending: true });
        games = res.data;
        gamesError = res.error;
    }

    // Fetch all upcoming leagues if needed
    let leagues: any[] | null = null;
    let leaguesError = null;
    if (activeView === 'all' || activeView === 'leagues') {
        const [leaguesRes, leagueGamesRes] = await Promise.all([
            supabase
                .from('leagues')
                .select('*')
                .neq('status', 'cancelled')
                .or('event_type.eq.league,event_type.is.null')
                .order('start_date', { ascending: true }),
            supabase
                .from('games')
                .select('*')
                .eq('event_type', 'league')
                .neq('status', 'cancelled')
                .or(`start_time.gt.${new Date().toISOString()},status.eq.active,status.eq.scheduled`)
                .order('start_time', { ascending: true })
        ]);

        // Merge results
        const leaguesTable = leaguesRes.data || [];
        const gamesLeaguesTable = leagueGamesRes.data || [];
        
        leagues = [...gamesLeaguesTable, ...leaguesTable];
        leaguesError = leaguesRes.error || leagueGamesRes.error;
    }

    // Fetch all upcoming tournaments if needed
    let tournaments: any[] | null = null;
    let tournamentsError = null;
    if (activeView === 'all' || activeView === 'tournaments') {
        const res = await supabase
            .from('games')
            .select('*, tournament_registrations(user_id, team_id, role)')
            .neq('status', 'cancelled')
            .eq('event_type', 'tournament')
            .or(`start_time.gt.${new Date().toISOString()},status.eq.active,status.eq.scheduled`)
            .order('start_time', { ascending: true });
        tournaments = res.data;
        tournamentsError = res.error;
    }

    if (gamesError) console.error("Error fetching games:", gamesError);
    if (leaguesError) console.error("Error fetching leagues:", leaguesError);
    if (tournamentsError) console.error("Error fetching tournaments:", tournamentsError);

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans pt-2 px-6 md:px-12 pb-24">
            <div className="max-w-7xl">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-white/5 pb-8">
                    <div>
                        <h1 className="font-heading text-5xl md:text-7xl font-bold uppercase italic tracking-tighter leading-none mb-2">
                            The <span className="text-pitch-accent">Hub</span>
                        </h1>
                        <p className="text-pitch-secondary text-sm font-bold uppercase tracking-widest opacity-60">
                            The Chicago and Northwest Suburbs Premier pickup platform
                        </p>
                    </div>
                    <Link href="/" className="inline-flex items-center text-pitch-secondary hover:text-white transition-colors text-xs font-black uppercase tracking-[0.2em] group">
                        <ArrowRight className="w-4 h-4 mr-2 rotate-180 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </Link>
                </div>

                <ScheduleClientView 
                    games={games}
                    leagues={leagues}
                    tournaments={tournaments}
                    activeView={activeView}
                    user={user}
                    bookingStatusMap={bookingStatusMap}
                    bookingIdMap={bookingIdMap}
                    userRegistrationsMap={userRegistrationsMap}
                />
            </div>
        </div>
    );
}
